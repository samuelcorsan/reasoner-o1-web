// Define your models here.

export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
}

export const models: Array<Model> = [
  {
    id: "reasoner-o1-mini",
    label: "reasoner-o1-mini",
    apiIdentifier: "gpt-4o-mini",
    description: "Faster reasoning",
  },
  {
    id: "reasoner-o1",
    label: "reasoner-o1",
    apiIdentifier: "gpt-4o",
    description: "The best at reasoning",
  },
] as const;

export const DEFAULT_MODEL_NAME: string = "reasoner-o1-mini";
