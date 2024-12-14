export type Thought = {
  title: string;
  content: string;
  next_action: "continue" | "final_answer";
};
