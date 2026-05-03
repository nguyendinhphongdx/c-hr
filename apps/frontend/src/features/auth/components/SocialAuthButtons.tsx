"use client";

import { GithubIcon, GoogleIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { oauthStartUrl } from "../services/authService";

export function SocialAuthButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => {
          window.location.href = oauthStartUrl("github");
        }}
      >
        <GithubIcon className="h-4 w-4" />
        GitHub
      </Button>
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => {
          window.location.href = oauthStartUrl("google");
        }}
      >
        <GoogleIcon className="h-4 w-4" />
        Google
      </Button>
    </div>
  );
}
