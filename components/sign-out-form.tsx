"use client";

import { signOut } from "@/app/(auth)/auth";

export const SignOutForm = () => {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevenir el comportamiento por defecto del formulario

    ("use server"); // Marcar que el bloque se ejecuta en el servidor (si aplica)

    await signOut({
      redirectTo: "/",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <button
        type="submit"
        className="w-full text-left px-1 py-0.5 text-red-500"
      >
        Sign out
      </button>
    </form>
  );
};
