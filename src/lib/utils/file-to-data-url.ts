/**
 * 브라우저 File을 Data URL(`data:image/jpeg;base64,...`) 문자열로 변환합니다.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") {
        resolve(r);
        return;
      }
      reject(new Error("FileReader did not return a data URL string"));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}

/** 여러 파일을 병렬로 Data URL 배열로 변환합니다. */
export async function readFilesAsDataUrls(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  return Promise.all(files.map((f) => readFileAsDataUrl(f)));
}
