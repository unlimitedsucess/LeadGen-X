"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Send, Mail, CheckCircle2, ChevronRight, Settings, Plus, Save } from "lucide-react";
import Link from 'next/link';

export default function Home() {
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState("linkedin");
  const [providers, setProviders] = useState({
    gmail: true,
    yahoo: false,
    hotmail: false,
    outlook: false,
    company: true,
  });

  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [searchQueryInfo, setSearchQueryInfo] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  const [savedEmails, setSavedEmails] = useState<string[]>([]);

  // Load saved emails on mount
  useEffect(() => {
    const saved = localStorage.getItem("saved_emails");
    if (saved) setSavedEmails(JSON.parse(saved));
  }, []);

  const handleSaveToMailer = () => {
    if (selectedEmails.size === 0) return;
    const currentSaved = JSON.parse(localStorage.getItem("saved_emails") || "[]");
    const newSaved = Array.from(new Set([...currentSaved, ...Array.from(selectedEmails)]));
    setSavedEmails(newSaved);
    localStorage.setItem("saved_emails", JSON.stringify(newSaved));
    alert(`${selectedEmails.size} emails saved for your campaign!`);
    setSelectedEmails(new Set());
  };

  const handleSearch = async (isLoadMore = false) => {
    if (!keywords) return;
    
    setLoading(true);
    const currentPage = isLoadMore ? page + 1 : 1;
    if (!isLoadMore) {
      setEmails([]);
      setSelectedEmails(new Set());
    }

    const activeProviders = Object.entries(providers)
      .filter(([key, active]) => active && key !== 'company')
      .map(([key]) => `@${key}.com`);
    
    // If company is selected, we allow '@' (which matches all domains)
    const allowCompanyDomain = providers.company;

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords,
          location,
          source,
          emailProviders: activeProviders,
          allowCompanyDomain: allowCompanyDomain,
          page: currentPage,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server error:", errorText.substring(0, 1000));
        alert("Server error. Check console for details.");
        return;
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response received:", text.substring(0, 500));
        alert("Received invalid response from server (HTML instead of JSON).");
        return;
      }

      const data = await res.json();
      if (data.success) {
        if (isLoadMore) {
          setEmails((prev) => Array.from(new Set([...prev, ...data.emails])));
        } else {
          setEmails(data.emails);
        }
        setPage(currentPage);
        setSearchQueryInfo(data.query);
      } else {
        alert("Search failed: " + (data.error || "Unknown error"));
      }
    } catch (error: any) {
      console.error("Failed to search", error);
      alert("Search failed: " + (error?.message || "Check network connection"));
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailSelection = (email: string) => {
    const newSelection = new Set(selectedEmails);
    if (newSelection.has(email)) {
      newSelection.delete(email);
    } else {
      newSelection.add(email);
    }
    setSelectedEmails(newSelection);
  };

  const selectAll = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails));
    }
  };

  const handleAddCustomEmail = () => {
    if (!customEmail || !customEmail.includes("@")) return;
    const lowerEmail = customEmail.toLowerCase();
    
    // Add to emails array if it doesn't exist
    if (!emails.includes(lowerEmail)) {
      setEmails([lowerEmail, ...emails]);
    }
    
    // Auto-select the newly added email
    const newSelection = new Set(selectedEmails);
    newSelection.add(lowerEmail);
    setSelectedEmails(newSelection);
    
    setCustomEmail(""); // Clear input
  };




  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 pt-12">
      <div className="flex flex-col items-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center p-3 bg-primary/20 text-primary rounded-full mb-4"
        >
          <Search className="w-8 h-8" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold tracking-tight text-center bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400 mb-4"
        >
          LeadGen X
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-400 text-center max-w-2xl text-lg"
        >
          Extract business emails from LinkedIn, GitHub, and search engines instantly. Curate targeted leads and dispatch bulk emails directly via Nodemailer.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Search Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-4"
        >
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center text-white">
              <span className="w-2 h-6 bg-primary rounded-full mr-3"></span>
              Search Parameters
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Keywords / Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full bg-input/50 border border-surface-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Location (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-input/50 border border-surface-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Source Network</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-input/50 border border-surface-border rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="github">GitHub</option>
                  <option value="web">General Web</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Target Providers</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors col-span-2">
                    <input
                      type="checkbox"
                      checked={providers.company}
                      onChange={() => setProviders({ ...providers, company: !providers.company })}
                      className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary bg-input"
                    />
                    <span className="text-white font-medium text-sm">Official / Company Domains</span>
                  </label>
                  {Object.entries(providers).filter(([key]) => key !== 'company').map(([key, value]) => (
                    <label key={key} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => setProviders({ ...providers, [key]: !value })}
                        className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary bg-input"
                      />
                      <span className="text-gray-300 text-sm capitalize">@{key}.com</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSearch(false)}
                disabled={loading || !keywords}
                className="w-full py-4 mt-4 bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50 rounded-xl text-white font-medium shadow-lg shadow-primary/25 transition-all flex justify-center items-center group relative overflow-hidden"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Find Leads
                  </>
                )}
                {/* Button shine effect */}
                <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-white opacity-20 group-hover:animate-[shine_1s]"></div>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Middle Column: Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-4 flex flex-col"
        >
          <div className="glass-panel rounded-2xl p-6 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center text-white">
                <span className="w-2 h-6 bg-accent rounded-full mr-3"></span>
                Verified Leads
              </h2>
              <span className="bg-primary/20 border border-primary/30 text-[10px] px-3 py-1 rounded-full text-primary font-bold tracking-wider uppercase">
                {emails.length} Validated
              </span>
            </div>

            <div className="mb-4 flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Manually add an email..."
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomEmail();
                    }
                  }}
                  className="flex-1 bg-input/50 border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                />
                <button
                  onClick={handleAddCustomEmail}
                  disabled={!customEmail || !customEmail.includes("@")}
                  className="px-4 py-2 bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 disabled:hover:bg-primary/20 rounded-lg text-sm font-medium transition-colors"
                >
                  Add
                </button>
              </div>

              {emails.length > 0 && (
                <button
                  onClick={selectAll}
                  className="text-sm text-primary hover:text-white transition-colors self-start"
                >
                  {selectedEmails.size === emails.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 min-h-[300px] max-h-[500px]">
              {emails.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <Mail className="w-10 h-10 mb-3 opacity-20" />
                  <p>No emails extracted yet.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {emails.map((email, idx) => (
                    <motion.div
                      key={email + idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: idx % 10 * 0.05 }}
                      onClick={() => toggleEmailSelection(email)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                        selectedEmails.has(email)
                          ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                          : "bg-surface/50 border-surface-border hover:bg-white/5"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-200 truncate">{email}</span>
                        <span className="text-[10px] text-primary/70 font-medium flex items-center mt-1">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          MX Verified
                        </span>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                        selectedEmails.has(email) ? "border-primary bg-primary" : "border-gray-500 group-hover:border-primary/50"
                      }`}>
                        {selectedEmails.has(email) && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {emails.length > 0 && (
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => handleSearch(true)}
                  disabled={loading}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                  More
                </button>
                <button
                  onClick={handleSaveToMailer}
                  disabled={selectedEmails.size === 0}
                  className="flex-[2] py-3 bg-primary hover:opacity-90 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save {selectedEmails.size} Leads
                </button>
              </div>
            )}
            {searchQueryInfo && (
              <p className="mt-4 text-xs text-gray-500 break-all border-t border-white/10 pt-4">
                <strong className="text-gray-400">Query:</strong> {searchQueryInfo}
              </p>
            )}
          </div>
        </motion.div>

        {/* Right Column: Collection Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-4"
        >
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden h-full flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Mail className="w-32 h-32 rotate-12" />
            </div>

            <h2 className="text-xl font-semibold mb-6 flex items-center text-white relative z-10">
              <span className="w-2 h-6 bg-pink-500 rounded-full mr-3"></span>
              Campaign Hub
            </h2>

            <div className="flex-1 relative z-10">
              <div className="p-6 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl mb-6">
                <p className="text-gray-400 text-sm mb-1">Total Saved Contacts</p>
                <h3 className="text-5xl font-bold text-white mb-2">{savedEmails.length}</h3>
                <p className="text-xs text-green-400 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                  Ready for outreach
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-pink-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">Verified Quality</p>
                    <p className="text-xs text-gray-500">Every saved lead passes MX validation before joining your list.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">Continuous Growth</p>
                    <p className="text-xs text-gray-500">Search multiple keywords to build a massive target database.</p>
                  </div>
                </div>
              </div>
            </div>

            <Link href="/mailer" className="mt-8 relative z-10">
              <button className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 transition-all rounded-xl text-white font-bold shadow-xl shadow-pink-500/20 flex justify-center items-center group">
                Go to Mailer Dashboard
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </motion.div>
      </div>

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
