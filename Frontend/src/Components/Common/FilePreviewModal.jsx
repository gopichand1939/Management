import { ExternalLink, FileText, X } from "lucide-react";

const isImageFile = (file) => {
  const mimeType = String(file?.mime_type || "").toLowerCase();
  const fileUrl = String(file?.file_url || "").toLowerCase();

  return (
    mimeType.startsWith("image/") ||
    fileUrl.endsWith(".jpg") ||
    fileUrl.endsWith(".jpeg") ||
    fileUrl.endsWith(".png") ||
    fileUrl.endsWith(".webp")
  );
};

const FilePreviewModal = ({
  file,
  title = "Preview",
  onClose,
}) => {
  if (!file?.file_url) {
    return null;
  }

  const fileName = file.original_name || file.file_name || "Uploaded file";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0 text-left">
            <h2 className="text-lg font-black text-slate-800">{title}</h2>
            <p className="truncate text-xs font-semibold text-slate-400">{fileName}</p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={file.file_url}
              target="_blank"
              rel="noreferrer"
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-800"
              title="Open in new tab"
            >
              <ExternalLink size={16} />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-800"
              title="Close preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="min-h-[320px] overflow-auto bg-slate-50 p-4">
          {isImageFile(file) ? (
            <img
              src={file.file_url}
              alt={fileName}
              className="mx-auto max-h-[72vh] max-w-full rounded-xl border border-slate-100 bg-white object-contain shadow-sm"
            />
          ) : (
            <div className="h-[72vh] overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
              <iframe
                src={file.file_url}
                title={fileName}
                className="h-full w-full"
              />
            </div>
          )}

          {!isImageFile(file) && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <FileText size={14} />
              <span>If the preview does not load, open the file in a new tab.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
