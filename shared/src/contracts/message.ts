export type RealtimeMessage = {
  id: string;
  sessionToken: string;
  createdAt: string; // ISO timestamp
  senderId: string;
  kind: "text";
  text: string;
  origin: "typed" | "speech" | "sign";
};

