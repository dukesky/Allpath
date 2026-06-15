const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const DEFAULT_AVATARS = [
  "/avatars/default-cat.png",
  "/avatars/default-fox.png",
  "/avatars/default-owl.png",
  "/avatars/default-panda.png",
  "/avatars/default-penguin.png",
  "/avatars/default-rabbit.png",
];

export function getDefaultAvatarUrl(index: number): string {
  const len = DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[((index % len) + len) % len];
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file.");
  }

  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Avatar image must be smaller than 2MB.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Failed to read avatar image."));
    };

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to process avatar image."));
        return;
      }
      resolve(reader.result);
    };

    reader.readAsDataURL(file);
  });
}
