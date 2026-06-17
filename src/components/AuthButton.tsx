"use client";

import { authClient } from "@/lib/auth-client";
import { LogOut, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "@/components/Menu";

export function AuthButton() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <div className="w-8 h-8 rounded-full bg-surface-100 animate-pulse" />;
  }

  if (session) {
    return (
      <Menu.Root>
        <Menu.Trigger className="outline-none focus-visible:ring-2 focus-visible:ring-black rounded-full">
          <div className="flex items-center justify-center transition-opacity hover:opacity-80">
            {session.user.image ? (
              <Image 
                src={session.user.image} 
                alt={session.user.name} 
                width={36} 
                height={36} 
                className="rounded-full border border-surface-200"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-surface-800 text-white flex items-center justify-center text-sm font-medium">
                {session.user.name.charAt(0)}
              </div>
            )}
          </div>
        </Menu.Trigger>
        <Menu.Content>
          <Menu.Label>
            <p className="text-sm font-medium text-black truncate">{session.user.name}</p>
            <p className="text-xs text-surface-500 truncate">{session.user.email}</p>
          </Menu.Label>
          <Menu.Separator />
          <Menu.Item 
            onClick={() => authClient.signOut()}
            className="text-status-danger"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    );
  }

  return (
    <Link
      href="/login"
      className="text-surface-600 hover:text-black transition-colors px-3 py-2 rounded-lg hover:bg-surface-50 flex items-center gap-2"
      title="로그인"
    >
      <User className="w-5 h-5" />
      <span className="text-sm font-medium tracking-widest">로그인</span>
    </Link>
  );
}
