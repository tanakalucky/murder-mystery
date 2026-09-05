import { Button } from "@repo/ui/components/button";
import { Upload } from "lucide-react";
import { type ChangeEvent, useRef } from "react";

interface Props {
  onFilesSelected: (files: readonly File[]) => void;
}

export const UploadButton = ({ onFilesSelected }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFilesSelected(Array.from(event.target.files ?? []));
    // 同じファイルを続けて選び直せるよう毎回クリアする
    event.target.value = "";
  };

  return (
    <>
      <Button onClick={() => inputRef.current?.click()}>
        <Upload aria-hidden />
        アップロード
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
};
