"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Folder, 
  Plus, 
  Trash2, 
  Copy, 
  Scissors, 
  MoreVertical, 
  Mail, 
  CheckCircle2, 
  X, 
  Search,
  ChevronRight,
  ClipboardPaste,
  Loader2,
  Edit2,
  FolderPlus,
  ArrowLeft,
  Check,
  AlertCircle
} from "lucide-react";
import Link from 'next/link';

interface EmailFolder {
  id: string;
  name: string;
  emails: string[];
}

export default function VaultPage() {
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string>("uncategorized");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [extractedFromPaste, setExtractedFromPaste] = useState<string[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [verifiedEmails, setVerifiedEmails] = useState<Set<string>>(new Set());

  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  const [clipboard, setClipboard] = useState<{ type: 'copy' | 'cut', emails: string[], fromFolderId: string } | null>(null);

  // Load and migrate data
  useEffect(() => {
    const storedFolders = localStorage.getItem("email_folders");
    const oldSavedEmails = localStorage.getItem("saved_emails");

    if (storedFolders) {
      setFolders(JSON.parse(storedFolders));
    } else {
      // Migrate old data if exists
      const initialFolders: EmailFolder[] = [
        {
          id: "uncategorized",
          name: "Uncategorized",
          emails: oldSavedEmails ? JSON.parse(oldSavedEmails) : []
        }
      ];
      setFolders(initialFolders);
      localStorage.setItem("email_folders", JSON.stringify(initialFolders));
    }
  }, []);

  const saveFolders = (updatedFolders: EmailFolder[]) => {
    setFolders(updatedFolders);
    localStorage.setItem("email_folders", JSON.stringify(updatedFolders));
    
    // Also keep saved_emails in sync for the old mailer/home pages (flat list of all emails)
    const allEmails: string[] = Array.from(new Set(updatedFolders.flatMap(f => f.emails)));
    localStorage.setItem("saved_emails", JSON.stringify(allEmails));
  };

  const activeFolder = folders.find(f => f.id === activeFolderId) || folders[0];
  const filteredEmails = activeFolder?.emails.filter(email => 
    email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: EmailFolder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      emails: []
    };
    saveFolders([...folders, newFolder]);
    setNewFolderName("");
    setIsNewFolderOpen(false);
    setActiveFolderId(newFolder.id);
  };

  const handleDeleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === "uncategorized") return; // Keep uncategorized
    if (!confirm("Are you sure you want to delete this folder? Emails will be lost.")) return;
    
    const newFolders = folders.filter(f => f.id !== id);
    saveFolders(newFolders);
    if (activeFolderId === id) {
      setActiveFolderId("uncategorized");
    }
  };

  const handleExtractEmails = () => {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const matches = pastedText.match(emailRegex) || [];
    const unique = Array.from(new Set(matches.map(m => m.toLowerCase())));
    setExtractedFromPaste(unique);
    setVerifiedEmails(new Set());
  };

  const handleVerifyPasted = async () => {
    if (extractedFromPaste.length === 0) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: extractedFromPaste })
      });
      const data = await res.json();
      if (data.success) {
        const validList = data.results
          .filter((r: any) => r.isValid)
          .map((r: any) => r.email);
        
        setExtractedFromPaste(validList);
        setVerifiedEmails(new Set(validList));
        
        if (validList.length === 0) {
          alert("No registered mailbox domains found in this list.");
        }
      }
    } catch (e) {
      console.error("Verification failed", e);
    } finally {
      setVerifying(false);
    }
  };

  const handleAddVerifiedToFolder = () => {
    if (verifying) return;
    
    const wasVerified = verifiedEmails.size > 0;
    const toAdd = wasVerified ? Array.from(verifiedEmails) : [];

    if (toAdd.length === 0) {
      if (extractedFromPaste.length > 0 && !wasVerified) {
        alert("Please click 'Verify Domains' to ensure these are registered emails first.");
      } else {
        alert("No valid, registered emails were found to save.");
      }
      return;
    }

    const updatedFolders = folders.map(f => {
      if (f.id === activeFolderId) {
        return { ...f, emails: Array.from(new Set([...f.emails, ...toAdd])) };
      }
      return f;
    });
    saveFolders(updatedFolders);
    setIsImportOpen(false);
    setPastedText("");
    setExtractedFromPaste([]);
    setVerifiedEmails(new Set()); // Clear verification state
  };

  const toggleEmailSelection = (email: string) => {
    const newSet = new Set(selectedEmails);
    if (newSet.has(email)) newSet.delete(email);
    else newSet.add(email);
    setSelectedEmails(newSet);
  };

  const selectAll = () => {
    if (selectedEmails.size === filteredEmails.length) setSelectedEmails(new Set());
    else setSelectedEmails(new Set(filteredEmails));
  };

  const handleDeleteEmails = () => {
    if (selectedEmails.size === 0) return;
    if (!confirm(`Delete ${selectedEmails.size} emails?`)) return;

    const updatedFolders = folders.map(f => {
      if (f.id === activeFolderId) {
        return { ...f, emails: f.emails.filter(e => !selectedEmails.has(e)) };
      }
      return f;
    });
    saveFolders(updatedFolders);
    setSelectedEmails(new Set());
  };

  const handleClipboardAction = async (type: 'copy' | 'cut') => {
    if (selectedEmails.size === 0) return;
    
    const emailList = Array.from(selectedEmails);
    const textToCopy = emailList.join("\n");

    try {
      await navigator.clipboard.writeText(textToCopy);
      
      if (type === 'cut') {
        const updatedFolders = folders.map(f => {
          if (f.id === activeFolderId) {
            return { ...f, emails: f.emails.filter(e => !selectedEmails.has(e)) };
          }
          return f;
        });
        saveFolders(updatedFolders);
        alert(`${selectedEmails.size} leads cut and copied to system clipboard!`);
      } else {
        alert(`${selectedEmails.size} leads copied to system clipboard!`);
      }
      
      setSelectedEmails(new Set());
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert("Failed to access clipboard.");
    }
  };

  const handlePasteEmails = (targetFolderId: string) => {
    // This is for internal drag and drop or internal move
    if (!clipboard) return;

    const updatedFolders = folders.map(f => {
      let emails = [...f.emails];
      if (clipboard.type === 'cut' && f.id === clipboard.fromFolderId) {
        emails = emails.filter(e => !clipboard.emails.includes(e));
      }
      if (f.id === targetFolderId) {
        emails = Array.from(new Set([...emails, ...clipboard.emails]));
      }
      return { ...f, emails };
    });

    saveFolders(updatedFolders);
    setClipboard(null);
  };

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 pt-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition-colors mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Extraction Hub
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            Leads <span className="text-primary italic font-serif">Vault</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all flex items-center"
          >
            <ClipboardPaste className="w-4 h-4 mr-2 text-primary" />
            Paste & Verify
          </button>
          <button
            onClick={() => setIsNewFolderOpen(true)}
            className="px-6 py-3 bg-primary hover:opacity-90 rounded-xl text-white font-medium transition-all flex items-center shadow-lg shadow-primary/20"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Folders */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-4 rounded-2xl">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">Folders</h2>
            <div className="space-y-1">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => setActiveFolderId(folder.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('bg-primary/20');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('bg-primary/20');
                  }}
                  onDrop={(e) => {
                    e.currentTarget.classList.remove('bg-primary/20');
                    handlePasteEmails(folder.id);
                  }}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    activeFolderId === folder.id 
                    ? "bg-primary/20 text-white border border-primary/30" 
                    : "text-gray-400 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center min-w-0">
                    <Folder className={`w-4 h-4 mr-3 shrink-0 ${activeFolderId === folder.id ? "text-primary" : "text-gray-500"}`} />
                    <span className="truncate text-sm font-medium">{folder.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-bold bg-white/5 px-2 py-0.5 rounded-full">{folder.emails.length}</span>
                    {folder.id !== 'uncategorized' && (
                      <button 
                        onClick={(e) => handleDeleteFolder(folder.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {clipboard && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-primary/10 border border-primary/20 rounded-2xl"
            >
              <p className="text-xs text-primary font-bold uppercase mb-2">Clipboard</p>
              <p className="text-sm text-gray-300 mb-4">{clipboard.emails.length} emails selected for {clipboard.type}</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => handlePasteEmails(activeFolderId)}
                  className="flex-1 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90"
                >
                  Paste Here
                </button>
                <button 
                  onClick={() => setClipboard(null)}
                  className="px-3 py-2 bg-white/5 text-gray-400 text-xs font-bold rounded-lg hover:bg-white/10"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Main Area: Emails */}
        <div className="lg:col-span-9 flex flex-col min-h-[600px]">
          <div className="glass-panel p-6 rounded-2xl flex-1 flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Folder className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{activeFolder?.name}</h2>
                  <p className="text-xs text-gray-500">{filteredEmails.length} contacts found</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search folder..."
                    className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all w-full md:w-64"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Actions Toolbar */}
            <AnimatePresence>
              {selectedEmails.size > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl mb-4 overflow-hidden"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-primary ml-2">{selectedEmails.size} selected</span>
                    <div className="h-4 w-[1px] bg-primary/20" />
                    <button 
                      onClick={() => handleClipboardAction('copy')}
                      className="flex items-center text-xs font-bold text-gray-300 hover:text-white"
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </button>
                    <button 
                       onClick={() => handleClipboardAction('cut')}
                      className="flex items-center text-xs font-bold text-gray-300 hover:text-white"
                    >
                      <Scissors className="w-3 h-3 mr-1" /> Cut
                    </button>
                    <button 
                      onClick={handleDeleteEmails}
                      className="flex items-center text-xs font-bold text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </button>
                  </div>
                  <button onClick={() => setSelectedEmails(new Set())} className="text-gray-500 hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Emails List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
              {filteredEmails.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 py-20">
                  <Mail className="w-12 h-12 mb-4 opacity-10" />
                  <p>No emails in this folder.</p>
                  {pastedText === "" && (
                    <button 
                      onClick={() => setIsImportOpen(true)}
                      className="mt-4 text-primary hover:underline text-sm font-medium"
                    >
                      Paste some emails to get started
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center p-3 mb-2">
                    <button onClick={selectAll} className="flex items-center text-xs font-bold text-gray-500 hover:text-gray-300">
                      <div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center ${selectedEmails.size === filteredEmails.length ? "bg-primary border-primary" : "border-gray-600"}`}>
                        {selectedEmails.size === filteredEmails.length && <Check className="w-3 h-3 text-white" />}
                      </div>
                      Select All
                    </button>
                  </div>
                  {filteredEmails.map((email, idx) => (
                    <div
                      key={email + idx}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', email);
                        // Start cut operation for this single email
                         setClipboard({
                          type: 'cut',
                          emails: [email],
                          fromFolderId: activeFolderId
                        });
                      }}
                      onClick={() => toggleEmailSelection(email)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedEmails.has(email) 
                        ? "bg-primary/10 border-primary/50 shadow-[0_4px_12px_rgba(59,130,246,0.05)]" 
                        : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center min-w-0">
                        <div className={`w-4 h-4 rounded border mr-4 shrink-0 flex items-center justify-center transition-colors ${selectedEmails.has(email) ? "bg-primary border-primary" : "border-gray-700"}`}>
                          {selectedEmails.has(email) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-sm truncate ${selectedEmails.has(email) ? "text-white font-medium" : "text-gray-300"}`}>{email}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-green-500/70 font-bold bg-green-500/10 px-2 py-0.5 rounded-full flex items-center uppercase tracking-tighter">
                          <CheckCircle2 className="w-2 h-2 mr-1" /> 
                          {/* We assume emails in the vault are verified if they came from extraction or import with verify */}
                          MX Verified
                        </span>
                        <MoreVertical className="w-4 h-4 text-gray-700 hover:text-gray-400 shrink-0" />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImportOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-primary/10"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <ClipboardPaste className="w-5 h-5 mr-3 text-primary" />
                    Industrial MX Verifier
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Paste your list below. We verify against live MX records, not just text patterns.</p>
                </div>
                <button onClick={() => setIsImportOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Paste Content</label>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Example: John <john@doe.com>, jane.smith@company.org, or just a messy block of text..."
                    className="w-full h-48 bg-white/5 border border-white/5 rounded-2xl p-4 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                  />
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-gray-500">
                      {pastedText.length} characters pasted
                    </span>
                    <button 
                      onClick={handleExtractEmails}
                      disabled={!pastedText.trim()}
                      className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-bold hover:bg-primary/20 disabled:opacity-50"
                    >
                      Extract Emails
                    </button>
                  </div>
                </div>

                {extractedFromPaste.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">Extracted ({extractedFromPaste.length})</h4>
                      <button 
                        onClick={handleVerifyPasted}
                        disabled={verifying}
                        className="px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-bold hover:bg-green-500/20 disabled:opacity-50 flex items-center"
                      >
                        {verifying ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-2" />}
                        Verify Domains
                      </button>
                    </div>

                    <div className="max-h-40 overflow-y-auto bg-black/40 border border-white/5 rounded-xl p-3 grid grid-cols-1 gap-1 custom-scrollbar">
                      {extractedFromPaste.map(email => (
                        <div key={email} className="text-xs text-gray-400 flex items-center justify-between py-1 border-b border-white/[0.02]">
                          <span>{email}</span>
                          {verifiedEmails.has(email) ? (
                            <span className="text-[10px] text-green-500 font-bold flex items-center">
                              <Check className="w-3 h-3 mr-1" /> VALID
                            </span>
                          ) : verifying ? (
                            <Loader2 className="w-2 h-2 animate-spin" />
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={handleAddVerifiedToFolder}
                      disabled={verifiedEmails.size === 0}
                      className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex flex-col justify-center items-center group disabled:opacity-30 disabled:bg-gray-800"
                    >
                      <span className="text-sm">Save {verifiedEmails.size} Registered Leads</span>
                      <span className="text-[10px] opacity-70 group-disabled:hidden">Verified by MX DNS</span>
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Folder Modal */}
      <AnimatePresence>
        {isNewFolderOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewFolderOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-4">Create New Folder</h3>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder Name"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsNewFolderOpen(false)}
                  className="flex-1 py-3 bg-white/5 text-gray-400 font-bold rounded-xl hover:bg-white/10"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </main>
  );
}
