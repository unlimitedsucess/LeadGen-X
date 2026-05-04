"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Mail, 
  User, 
  Settings, 
  Loader2, 
  CheckCircle2, 
  ChevronDown, 
  X, 
  Search,
  ArrowLeft,
  Users,
  CheckCircle2 as CheckIcon,
  Check,
  Loader2 as LoaderIcon
} from "lucide-react";
import Link from 'next/link';

interface EmailFolder {
  id: string;
  name: string;
  emails: string[];
}

export default function MailerPage() {
  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string>("all");
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [senderName, setSenderName] = useState("Felix James Amani");
  const [senderEmail, setSenderEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState("Partnership Opportunity: Mineral Supply Chain Collaboration");
  const [body, setBody] = useState(`Good day ,

I’m reaching out to explore a potential partnership in the sale of coltan stones and palladium minerals in South Africa. We operate a mine
in the Democratic Republic of Congo and currently have a buyer in South Africa. To facilitate a smooth transaction and an efficient supply
chain, I am seeking a local partner to assist with the process.


We are ready to ship the minerals and would appreciate your involvement.

This is legitimate, be rest assured.

If this opportunity interests you, please send me your contact number
for us to discuss further on WhatsApp.

Best Regards ,
Felix James Amani .`);
  
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("465");
  const [showSmtpSettings, setShowSmtpSettings] = useState(false);
  
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isPlainText, setIsPlainText] = useState(true);

  // Drag selection state
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragSelectionMode, setDragSelectionMode] = useState<'select' | 'deselect' | null>(null);
  const scrollRef = useState<HTMLDivElement | null>(null)[0]; // We'll use a ref instead

  useEffect(() => {
    const saved = localStorage.getItem("saved_emails");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedEmails(parsed);
      setSelectedRecipients(new Set(parsed));
    }

    const storedFolders = localStorage.getItem("email_folders");
    if (storedFolders) {
      setFolders(JSON.parse(storedFolders));
    }
    
    // Global mouse up for drag selection
    const handleGlobalMouseUp = () => {
      setIsDraggingSelection(false);
      setDragSelectionMode(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    // Load last used SMTP settings if any
    const lastSender = localStorage.getItem("last_sender_email");
    if (lastSender) setSenderEmail(lastSender);
    const lastName = localStorage.getItem("last_sender_name");
    if (lastName) setSenderName(lastName);
    const lastReplyTo = localStorage.getItem("last_reply_to");
    if (lastReplyTo) setReplyTo(lastReplyTo);
    const lastHost = localStorage.getItem("last_smtp_host");
    if (lastHost) setSmtpHost(lastHost);
    const lastPort = localStorage.getItem("last_smtp_port");
    if (lastPort) setSmtpPort(lastPort);

    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const getEmailsToDisplay = () => {
    if (activeFolderId === "all") return savedEmails;
    const folder = folders.find(f => f.id === activeFolderId);
    return folder ? folder.emails : [];
  };

  const filteredEmails = getEmailsToDisplay().filter((email: string) => 
    email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleRecipient = (email: string) => {
    const newSet = new Set(selectedRecipients);
    if (newSet.has(email)) newSet.delete(email);
    else newSet.add(email);
    setSelectedRecipients(newSet);
  };

  const selectAll = () => {
    if (selectedRecipients.size === filteredEmails.length) setSelectedRecipients(new Set());
    else setSelectedRecipients(new Set(filteredEmails));
  };

  const selectCount = (count: number) => {
    const newSet = new Set(selectedRecipients);
    let added = 0;
    for (const email of filteredEmails) {
      if (!newSet.has(email)) {
        newSet.add(email);
        added++;
      }
      if (added >= count) break;
    }
    setSelectedRecipients(newSet);
  };

  const handleStartDragSelection = (email: string, isCurrentlySelected: boolean) => {
    setIsDraggingSelection(true);
    const newMode = isCurrentlySelected ? 'deselect' : 'select';
    setDragSelectionMode(newMode);
    
    const newSet = new Set(selectedRecipients);
    if (newMode === 'select') newSet.add(email);
    else newSet.delete(email);
    setSelectedRecipients(newSet);
  };

  const handleMouseEnterEmail = (email: string, e: React.MouseEvent) => {
    if (!isDraggingSelection || !dragSelectionMode) return;
    
    const newSet = new Set(selectedRecipients);
    if (dragSelectionMode === 'select') newSet.add(email);
    else newSet.delete(email);
    setSelectedRecipients(newSet);

    // Auto-scroll logic
    const container = e.currentTarget.closest('.overflow-y-auto');
    if (container) {
      const rect = container.getBoundingClientRect();
      const threshold = 50;
      if (e.clientY < rect.top + threshold) {
        container.scrollTop -= 20;
      } else if (e.clientY > rect.bottom - threshold) {
        container.scrollTop += 20;
      }
    }
  };

  const moveToSent = (email: string) => {
    let storedFolders = localStorage.getItem("email_folders");
    let allFolders: EmailFolder[] = [];
    
    if (storedFolders) {
      allFolders = JSON.parse(storedFolders);
    } else {
      // Initialize folders if they don't exist yet
      allFolders = [
        { id: "uncategorized", name: "Uncategorized", emails: savedEmails.filter(e => e !== email) },
        { id: "sent-" + Date.now(), name: "Sent Campaigns", emails: [] }
      ];
    }
    
    // 1. Remove from all existing folders
    allFolders = allFolders.map(f => ({
      ...f,
      emails: f.emails.filter(e => e !== email)
    }));
    
    // 2. Add to "Sent Campaigns" folder
    let sentFolder = allFolders.find(f => f.name === "Sent Campaigns");
    if (!sentFolder) {
      sentFolder = { id: 'sent-' + Date.now(), name: 'Sent Campaigns', emails: [] };
      allFolders.push(sentFolder);
    }
    if (!sentFolder.emails.includes(email)) {
      sentFolder.emails.push(email);
    }
    
    // 3. Persist and update state
    localStorage.setItem("email_folders", JSON.stringify(allFolders));
    setFolders(allFolders);
    
    const newAllEmails = Array.from(new Set(allFolders.flatMap(f => f.emails)));
    localStorage.setItem("saved_emails", JSON.stringify(newAllEmails));
    setSavedEmails(newAllEmails);
  };

  const handleSend = async () => {
    if (selectedRecipients.size === 0) {
      alert("Please select at least one recipient. Click 'Manage List' to choose emails.");
      return;
    }
    if (!subject.trim()) {
      alert("Please enter a Subject Line.");
      return;
    }
    if (!body.trim()) {
      alert("Please enter Message Content.");
      return;
    }
    if (!senderEmail) {
      setShowSmtpSettings(true);
      alert("Please enter your Verified Brevo Sender Email.");
      return;
    }

    setSending(true);
    setSendResult(null);

    // Persist sender info for next time
    localStorage.setItem("last_sender_email", senderEmail);
    localStorage.setItem("last_sender_name", senderName);
    localStorage.setItem("last_reply_to", replyTo);
    localStorage.setItem("last_smtp_host", smtpHost);
    localStorage.setItem("last_smtp_port", smtpPort);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: Array.from(selectedRecipients),
          subject,
          body: body, // Use the auto-filled body as is
          smtpEmail: senderEmail,
          smtpPassword,
          smtpHost,
          smtpPort,
          replyTo,
          senderName,
          isPlainText
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        // --- MOVE TO SENT LOGIC (Bulk) ---
        const sentEmails = Array.from(selectedRecipients);
        let storedFolders = localStorage.getItem("email_folders");
        let allFolders: EmailFolder[] = [];
        
        if (storedFolders) {
          allFolders = JSON.parse(storedFolders);
        } else {
          allFolders = [{ id: "uncategorized", name: "Uncategorized", emails: savedEmails }];
        }
        
        // 1. Remove from all existing folders
        allFolders = allFolders.map(f => ({
          ...f,
          emails: f.emails.filter(e => !selectedRecipients.has(e))
        }));
        
        // 2. Add to "Sent Campaigns" folder
        let sentFolder = allFolders.find(f => f.name === "Sent Campaigns");
        if (!sentFolder) {
          sentFolder = { id: 'sent-' + Date.now(), name: 'Sent Campaigns', emails: [] };
          allFolders.push(sentFolder);
        }
        sentFolder.emails = Array.from(new Set([...sentFolder.emails, ...sentEmails]));
        
        // 3. Persist and update state
        localStorage.setItem("email_folders", JSON.stringify(allFolders));
        setFolders(allFolders);
        
        const newAllEmails = Array.from(new Set(allFolders.flatMap(f => f.emails)));
        localStorage.setItem("saved_emails", JSON.stringify(newAllEmails));
        setSavedEmails(newAllEmails);
        
        // 4. Clear selection
        setSelectedRecipients(new Set());
      }

      setSendResult({
        success: data.success,
        message: data.success ? `Success! ${selectedRecipients.size} emails moved to 'Sent Campaigns'` : data.error || "Failed to dispatch",
      });
    } catch (err: any) {
      setSendResult({ success: false, message: err.message || "An error occurred" });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition-colors mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Extractions
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            Mailer <span className="text-primary italic font-serif">Dashboard</span>
          </h1>
        </div>
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest md:mb-1">Status</div>
          <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 md:px-4 md:py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs md:text-sm font-medium text-gray-200">Engine Online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Column */}
        <div className="lg:col-span-1 space-y-6">
          <section className="glass-panel p-6 rounded-2xl relative overflow-hidden">
            {/* Status indicator for Brevo */}
            <div className="absolute top-0 right-0 px-3 py-1 bg-green-500/10 border-b border-l border-green-500/20 rounded-bl-xl flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-2"></div>
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-tight">Brevo API Active</span>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center">
                <User className="w-5 h-5 mr-2 text-primary" />
                Sender Identity
              </h2>
              <button 
                onClick={() => setShowSmtpSettings(!showSmtpSettings)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400"
                title="Configuration"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Your Full Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-input/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Verified Brevo Sender Email</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="e.g. support@elgreenglobal.com"
                  className="w-full bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <p className="text-[9px] text-gray-500 mt-1 ml-1">Must be the email or domain verified in Brevo.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Reply-To Email (Where you receive answers)</label>
                <input
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full bg-input/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <AnimatePresence>
                {showSmtpSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4 mt-2 mb-4">
                        <div className="text-[10px] text-gray-500 font-medium mb-2 leading-tight">
                          Note: Professional API mode is enabled. Manual SMTP settings below are currently ignored.
                        </div>
                        <div className="opacity-40 pointer-events-none">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">SMTP Host (Ignored)</label>
                            <input
                              type="text"
                              value={smtpHost}
                              readOnly
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Port</label>
                              <input
                                type="text"
                                value={smtpPort}
                                readOnly
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Password</label>
                              <input
                                type="password"
                                value="********"
                                readOnly
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                  </motion.div>
                )}
              </AnimatePresence>


              <div className="p-4 bg-white/5 border border-dashed border-white/10 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-gray-300">Recipients</span>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                    {selectedRecipients.size} Selected
                  </span>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-all flex items-center justify-center group"
                >
                  <Users className="w-4 h-4 mr-2 text-gray-400 group-hover:text-primary" />
                  Manage List
                  <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                </button>
              </div>
            </div>
          </section>

          <section className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />
                Gmail Protection Active
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setIsPlainText(!isPlainText)}>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isPlainText ? "bg-primary border-primary" : "border-gray-600"}`}>
                    {isPlainText && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-none mb-1">Send as Plain Text</div>
                    <div className="text-[9px] text-gray-500">Highest deliverability for Gmail</div>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 leading-relaxed">
                  We've enabled <span className="text-primary font-bold">randomized fingerprinting</span> and <span className="text-primary font-bold">cooldown breaks</span> (every 10 emails) to protect your account.
                </p>
                <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                  <p className="text-[10px] font-bold text-primary uppercase mb-1">💡 Pro Tips:</p>
                  <ul className="text-[10px] text-gray-500 space-y-1 list-disc pl-3">
                    <li>Use <b>App Passwords</b> (16 digits).</li>
                    <li>Keep the <b>Plain Text</b> box checked.</li>
                    <li>Limit to 50-100 emails per day.</li>
                  </ul>
                </div>
              </div>
          </section>
        </div>

        {/* Composer Column */}
        <div className="lg:col-span-2 space-y-6">
          <section className="glass-panel p-8 rounded-2xl flex flex-col h-full min-h-[500px]">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="The perfect hook..."
                className="w-full bg-transparent border-b border-white/10 py-2 text-lg md:text-2xl font-semibold text-white focus:outline-none focus:border-primary transition-colors placeholder:text-gray-700"
              />
            </div>

            <div className="flex-1 flex flex-col min-h-[300px]">
              <label className="block text-sm font-medium text-gray-400 mb-2">Message Content</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Start typing your message here..."
                className="flex-1 bg-transparent text-gray-300 leading-relaxed resize-none focus:outline-none custom-scrollbar text-base md:text-lg"
              ></textarea>
            </div>

            {sendResult && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl text-sm mb-6 ${sendResult.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}
              >
                {sendResult.message}
              </motion.div>
            )}

            <button
              onClick={handleSend}
              disabled={sending}
              className="mt-4 w-full py-5 bg-gradient-to-r from-primary to-accent hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:shadow-none transition-all rounded-2xl text-white font-bold text-lg flex justify-center items-center group relative overflow-hidden"
            >
              {sending ? (
                <div className="flex items-center">
                  <Loader2 className="w-6 h-6 animate-spin mr-3" />
                  <span>Processing Campaign...</span>
                </div>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  Dispatch Campaign
                </>
              )}
              <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-white opacity-10 group-hover:animate-[shine_1s]"></div>
            </button>
          </section>
        </div>
      </div>

      {/* Recipient Selector Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center">
                  <Mail className="w-5 h-5 mr-3 text-primary" />
                  Select Recipients
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 pb-0">
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2 custom-scrollbar scrollbar-none">
                  <button
                    onClick={() => setActiveFolderId("all")}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      activeFolderId === "all" ? "bg-primary text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    All Leads ({savedEmails.length})
                  </button>
                  {folders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => setActiveFolderId(folder.id)}
                      className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                        activeFolderId === folder.id ? "bg-primary text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {folder.name} ({folder.emails.length})
                    </button>
                  ))}
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search leads..."
                    className="w-full bg-white/5 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                      {filteredEmails.length} Email Addresses
                    </p>
                    <div className="flex items-center gap-1 ml-2">
                      <span className="text-[10px] text-gray-600 uppercase font-bold mr-1">Batch:</span>
                      {[10, 20, 30, 50].map(count => (
                        <button
                          key={count}
                          onClick={() => selectCount(count)}
                          className="px-2 py-0.5 bg-white/5 hover:bg-primary/20 border border-white/10 rounded text-[10px] font-bold text-gray-400 hover:text-primary transition-all"
                        >
                          {count}
                        </button>
                      ))}
                    </div>

                    {selectedRecipients.size > 0 && (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="ml-3 px-3 py-1 bg-primary text-white text-[9px] font-black rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center"
                      >
                        {selectedRecipients.size} RECIPIENTS SELECTED
                      </motion.div>
                    )}
                  </div>
                  <button 
                    onClick={selectAll}
                    className="text-xs text-primary hover:text-white transition-colors py-1 px-3 rounded-md bg-primary/10 w-full sm:w-auto"
                  >
                    {selectedRecipients.size === filteredEmails.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-2 select-none">
                {filteredEmails.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                    <p className="text-gray-500">No leads found matching your search.</p>
                  </div>
                ) : (
                  filteredEmails.map((email, idx) => (
                    <motion.div
                      key={email}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.005 }}
                      onMouseEnter={(e) => handleMouseEnterEmail(email, e)}
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        handleStartDragSelection(email, selectedRecipients.has(email));
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedRecipients.has(email) 
                        ? "bg-primary/20 border-primary shadow-[0_4px_12px_rgba(59,130,246,0.1)]" 
                        : "bg-white/5 border-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span className={`text-sm ${selectedRecipients.has(email) ? "text-white font-medium" : "text-gray-400"}`}>
                        {email}
                      </span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        selectedRecipients.has(email) ? "bg-primary border-primary" : "border-gray-700"
                      }`}>
                        {selectedRecipients.has(email) && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="p-6 bg-white/5 border-t border-white/5 flex items-center justify-between">
                <span className="text-sm text-gray-400 font-medium">
                  {selectedRecipients.size} of {savedEmails.length} recipients ready
                </span>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25"
                >
                  Save Selection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes shine {
          100% {
            left: 125%;
          }
        }
      `}</style>
    </main>
  );
}
