export type FileSeed = {
  filename: string;
  contentType: string;
  size: number;
};

export const FILE_SEEDS: Record<string, FileSeed[]> = {
  default: [
    {
      filename: "project-plan.pdf",
      contentType: "application/pdf",
      size: 256000,
    },
    { filename: "design-assets.png", contentType: "image/png", size: 183000 },
    { filename: "meeting-notes.txt", contentType: "text/plain", size: 4096 },
  ],
  personal: [
    {
      filename: "budget.xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 102400,
    },
    { filename: "roadmap.md", contentType: "text/markdown", size: 5120 },
  ],
  team: [
    { filename: "team-photo.jpg", contentType: "image/jpeg", size: 204800 },
    {
      filename: "requirements.docx",
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 307200,
    },
    { filename: "research.pdf", contentType: "application/pdf", size: 512000 },
  ],
};
