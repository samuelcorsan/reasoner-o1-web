"use client";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  ChevronUp,
  CreditCard,
  LogOut,
  Moon,
  Sparkles,
  Sun,
  SunMedium,
  Trash,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import type { User } from "next-auth";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { startTransition, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { deleteAllChats } from "@/app/(chat)/actions";

export function SidebarUserNav({ user }: { user: User }) {
  const { setTheme, theme } = useTheme();
  const [deleteChatsOpen, setDeleteChatsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleDeleteChats = async () => {
    setIsPending(true);
    await deleteAllChats();
    setDeleteChatsOpen(false);
    setIsPending(false);
  };

  return (
    <SidebarMenu>
      <Dialog open={deleteChatsOpen} onOpenChange={setDeleteChatsOpen}>
        <DialogTrigger asChild></DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              Delete all chats
            </DialogTitle>
            <DialogDescription className="text-base mt-4">
              Are you absolutely sure you want to delete all chats? This action
              cannot be undone and you will lose all your conversation history.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border-destructive/20 border rounded-lg p-4 mt-4">
            <p className="text-destructive text-sm font-semibold">
              Warning: This action is irreversible
            </p>
          </div>
          <DialogFooter className="mt-6 gap-4">
            <Button variant="outline" onClick={() => setDeleteChatsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChats}
              disabled={isPending}
              className={cn("hover:bg-destructive/90", {
                "opacity-50 cursor-not-allowed": isPending,
              })}
            >
              {isPending ? (
                "Deleting..."
              ) : (
                <>
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete all chats
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
                <AvatarFallback className="rounded-lg">
                  {user.email}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={"top"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <Sparkles />
                Upgrade to Pro
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <SunMedium /> : <Moon />}
                {`Toggle ${theme === "light" ? "dark" : "light"} mode`}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                signOut({
                  redirectTo: "/",
                });
              }}
              className="cursor-pointer"
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
