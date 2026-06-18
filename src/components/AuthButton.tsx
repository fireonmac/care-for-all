"use client";

import { authClient } from "@/lib/auth-client";
import { LogOut, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
  }

  if (session) {
    return (
      <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 p-0 border-0 hover:bg-transparent">
              {session.user.image ? (
                <Image 
                  src={session.user.image} 
                  alt={session.user.name} 
                  width={36} 
                  height={36} 
                  className="rounded-full border border-border"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {session.user.name.charAt(0)}
                </div>
              )}
            </Button>
          } />
        <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-lg border-border">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="py-2 px-3">
              <p className="text-sm font-medium text-foreground truncate">{session.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="my-1 border-border" />
          <DropdownMenuItem 
            onClick={() => authClient.signOut()}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium cursor-pointer rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link
      href="/login"
      className="text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted flex items-center gap-2"
      title="로그인"
    >
      <User className="w-5 h-5" />
      <span className="text-sm font-medium tracking-widest">로그인</span>
    </Link>
  );
}
