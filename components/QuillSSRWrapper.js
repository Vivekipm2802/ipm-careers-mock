import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import ReactQuill from "react-quill";

const QuillNoSSRWrapper = dynamic(import("react-quill"), {
  ssr: false,
  loading: () => <p>Loading ...</p>,
});

export default function QuillWarapper({
  value,
  onChange,
  editorHeight = "120px",
}) {
  const [isClient, setIsClient] = useState(false);
  const modules = {
    toolbar: [
      [{ header: "1" }, { header: "2" }, { font: [] }],
      [{ size: [] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [
        { list: "ordered" },
        { list: "bullet" },
        { indent: "-1" },
        { indent: "+1" },
      ],
      ["link", "image", "video"],
      ["clean"],
    ],
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <>
      <style jsx global>{`
        .quill-editor-wrapper .ql-editor {
          min-height: ${editorHeight};
        }

        /* Fix video tooltip positioning */
        .quill-editor-wrapper .ql-tooltip {
          position: absolute;
          z-index: 1000;
          left: 50% !important;
          transform: translateX(-50%);
          margin-top: 10px;
        }

        .quill-editor-wrapper .ql-tooltip.ql-editing {
          left: 50% !important;
          transform: translateX(-50%);
        }

        .quill-editor-wrapper .ql-tooltip input[type="text"] {
          width: 300px;
        }

        /* Ensure tooltip appears above content */
        .quill-editor-wrapper .ql-container {
          position: relative;
        }
      `}</style>
      {ReactQuill != undefined && (
        <QuillNoSSRWrapper
          className="quill-editor-wrapper"
          modules={modules}
          value={value}
          onChange={(e) => {
            onChange(e);
          }}
          theme="snow"
        />
      )}
    </>
  );
}
