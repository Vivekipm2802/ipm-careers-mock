import { useState, useEffect } from 'react';

export default function useReactQuill() {
  const [ReactQuill, setReactQuill] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-quill').then((module) => {
        setReactQuill(module.default);
      });
    }
  }, []);

  return ReactQuill;
}