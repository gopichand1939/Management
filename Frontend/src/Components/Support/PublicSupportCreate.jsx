import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, Upload, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { SUPPORT_TICKET_CREATE } from "../../Utils/Constants";

const PublicSupportCreate = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    subject: "",
    category: "Suggestions",
  });
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Attachment must be less than 10MB");
        return;
      }
      setAttachment(file);
      setError("");

      const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if ([".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
        setAttachmentPreview(URL.createObjectURL(file));
      } else {
        setAttachmentPreview("pdf-placeholder");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = new FormData();
      Object.keys(formData).forEach((key) => {
        payload.append(key, formData[key]);
      });
      if (attachment) {
        payload.append("attachment", attachment);
      }

      const res = await fetch(SUPPORT_TICKET_CREATE, {
        method: "POST",
        body: payload,
      });

      const result = await res.json();
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || "Failed to raise support ticket. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans selection:bg-orange-500/30">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-500/10 via-slate-950 to-slate-950 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 via-pink-500 to-indigo-500" />

        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 font-bold mb-6 transition cursor-pointer select-none"
        >
          <ArrowLeft size={14} />
          <span>Back to Login</span>
        </Link>

        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-orange-500/10 p-3 rounded-2xl border border-orange-500/20 text-orange-500">
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent">
              Raise a Support Query
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Have an issue, suggestion, or enquiry? Fill out this quick form.
            </p>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-400 text-xs"
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 space-y-4"
          >
            <div className="bg-emerald-500/10 p-5 rounded-full border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Feedback Submitted!</h2>
            <p className="text-xs text-slate-400 text-center max-w-sm leading-relaxed">
              Thank you for sharing your suggestions. We have received your query and our team will review it shortly.
            </p>
            <button
              onClick={() => {
                setFormData({
                  name: "",
                  phone: "",
                  subject: "",
                  category: "Suggestions",
                });
                setAttachment(null);
                setAttachmentPreview(null);
                setSuccess(false);
              }}
              className="mt-4 bg-slate-800 hover:bg-slate-700 text-xs px-4 py-2.5 rounded-2xl text-slate-200 font-bold transition cursor-pointer"
            >
              Submit Another Query
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Your Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. John Doe"
                className="w-full h-11 bg-slate-950/80 border border-slate-800 rounded-2xl px-4 text-xs text-slate-100 placeholder:text-slate-650 focus:border-orange-500/50 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-200"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="e.g. 9876543210"
                className="w-full h-11 bg-slate-950/80 border border-slate-800 rounded-2xl px-4 text-xs text-slate-100 placeholder:text-slate-650 focus:border-orange-500/50 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-200"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Feedback Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full h-11 bg-slate-950/80 border border-slate-800 rounded-2xl px-4 text-xs text-slate-100 focus:border-orange-500/50 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-200 cursor-pointer"
              >
                <option value="Suggestions">Suggestions</option>
                <option value="Enquiries">Enquiries</option>
                <option value="Others">Others / Feedback</option>
              </select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Your Suggestions / Message</label>
              <textarea
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                required
                rows={3}
                placeholder="Enter your query, suggestions or feedback..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs text-slate-100 placeholder:text-slate-650 focus:border-orange-500/50 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-200 resize-none"
              />
            </div>

            {/* Attachment */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Attach Screenshot or PDF (Optional)</label>
              <div className="flex gap-4 items-center">
                <label className="flex items-center space-x-2 bg-slate-950 border border-slate-800 hover:border-slate-700/80 hover:bg-slate-900 px-4 py-2.5 rounded-2xl cursor-pointer transition-all duration-200 text-xs font-bold text-slate-300 shrink-0">
                  <Upload size={16} />
                  <span>Choose File</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {attachment && (
                  <div className="flex items-center space-x-3 bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-2xl max-w-xs overflow-hidden">
                    {attachmentPreview === "pdf-placeholder" ? (
                      <div className="bg-red-500/20 text-red-400 text-[10px] px-2 py-1 rounded-md font-bold uppercase">
                        PDF
                      </div>
                    ) : attachmentPreview ? (
                      <img
                        src={attachmentPreview}
                        alt="Preview"
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                    ) : null}
                    <span className="text-[11px] text-slate-400 truncate">{attachment.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 font-bold text-slate-950 rounded-2xl flex items-center justify-center text-xs tracking-wider uppercase cursor-pointer disabled:opacity-50 transition-all duration-300 shadow-lg shadow-orange-500/10"
            >
              {loading ? "Submitting Query..." : "Submit Support Query"}
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default PublicSupportCreate;
