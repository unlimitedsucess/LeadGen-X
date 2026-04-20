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
  Users
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

  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  
  const [smtpPassword, setSmtpPassword] = useState("");
  const [showSmtpSettings, setShowSmtpSettings] = useState(false);
  
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

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
    
    // Load last used SMTP settings if any
    const lastSender = localStorage.getItem("last_sender_email");
    if (lastSender) setSenderEmail(lastSender);
    const lastName = localStorage.getItem("last_sender_name");
    if (lastName) setSenderName(lastName);
    const lastReplyTo = localStorage.getItem("last_reply_to");
    if (lastReplyTo) setReplyTo(lastReplyTo);
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

  const handleSend = async () => {
    if (selectedRecipients.size === 0) {
      alert("Please select at least one recipient.");
      return;
    }
    if (!senderEmail || !smtpPassword) {
      setShowSmtpSettings(true);
      alert("Please configure your SMTP settings.");
      return;
    }

    setSending(true);
    setSendResult(null);

    // Persist sender info for next time
    localStorage.setItem("last_sender_email", senderEmail);
    localStorage.setItem("last_sender_name", senderName);
    localStorage.setItem("last_reply_to", replyTo);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: Array.from(selectedRecipients),
          subject,
          body: `Hi,\n\n${body}\n\nBest regards,\n${senderName}`,
          smtpEmail: senderEmail,
          smtpPassword,
          replyTo,
          senderName
        }),
      });

      const data = await res.json();
      setSendResult({
        success: data.success,
        message: data.success ? data.message : data.error || "Failed to dispatch",
      });
    } catch (err: any) {
      setSendResult({ success: false, message: err.message || "An error occurred" });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Extractions
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            Mailer <span className="text-primary italic font-serif">Dashboard</span>
          </h1>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Status</div>
          <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium text-gray-200">Engine Online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Column */}
        <div className="lg:col-span-1 space-y-6">
          <section className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center">
                <User className="w-5 h-5 mr-2 text-primary" />
                Sender Identity
              </h2>
              <button 
                onClick={() => setShowSmtpSettings(!showSmtpSettings)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400"
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
                <label className="block text-xs font-medium text-gray-400 mb-1">Reply-To Email</label>
                <input
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="e.g. support@yourbrand.com"
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
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4 mt-2 mb-4">
                      <div>
                        <label className="block text-[10px] font-bold text-primary uppercase mb-1">Gmail SMTP Address</label>
                        <input
                          type="email"
                          value={senderEmail}
                          onChange={(e) => setSenderEmail(e.target.value)}
                          placeholder="you@gmail.com"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-primary uppercase mb-1">App Password</label>
                        <input
                          type="password"
                          value={smtpPassword}
                          onChange={(e) => setSmtpPassword(e.target.value)}
                          placeholder="16-digit code"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                        />
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
                Ready to Send
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Your messages will be dispatched individually to each recipient to maximize deliverability and avoid spam filters.
              </p>
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
                className="w-full bg-transparent border-b border-white/10 py-2 text-xl md:text-2xl font-semibold text-white focus:outline-none focus:border-primary transition-colors placeholder:text-gray-700"
              />
            </div>

            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-gray-400 mb-2">Message Content</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Start typing your message here..."
                className="flex-1 bg-transparent text-gray-300 leading-relaxed resize-none focus:outline-none custom-scrollbar text-lg"
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
              disabled={sending || selectedRecipients.size === 0 || !subject || !body}
              className="mt-4 w-full py-5 bg-gradient-to-r from-primary to-accent hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:shadow-none transition-all rounded-2xl text-white font-bold text-lg flex justify-center items-center group relative overflow-hidden"
            >
              {sending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
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
              className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black"
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
                
                <div className="flex justify-between items-center mb-4">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    {filteredEmails.length} Email Addresses
                  </p>
                  <button 
                    onClick={selectAll}
                    className="text-xs text-primary hover:text-white transition-colors py-1 px-3 rounded-md bg-primary/10"
                  >
                    {selectedRecipients.size === filteredEmails.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar px-6 pb-6 space-y-2">
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
                      transition={{ delay: idx * 0.01 }}
                      onClick={() => toggleRecipient(email)}
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
                        {selectedRecipients.has(email) && <CheckCircle2 className="w-3 h-3 text-white" />}
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
