import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
  Hr,
  Link,
  Font,
} from "@react-email/components";
import * as React from "react";

interface WorkspaceInviteProps {
  url: string;
  workspaceName: string;
  inviterName: string;
  inviteeEmail?: string;
}

export default function WorkspaceInvite({
  url = "http://localhost:5173/invite/token",
  workspaceName = "My Workspace",
  inviterName = "Someone",
  inviteeEmail = "invitee@example.com",
}: WorkspaceInviteProps) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="sans-serif"
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily="sans-serif"
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff2",
            format: "woff2",
          }}
          fontWeight={600}
          fontStyle="normal"
        />
      </Head>
      <Preview>
        {inviterName} invited you to join {workspaceName} on Vault
      </Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                primary: "#18181b",
                "primary-foreground": "#fafafa",
              },
              borderRadius: {
                DEFAULT: "0.625rem",
              },
            },
          },
        }}
      >
        <Body className="bg-white font-sans text-zinc-950">
          <Container className="mx-auto py-10 px-4 max-w-md">
            <Section className="mb-8">
              <div className="flex items-center gap-2">
                <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md p-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5"
                  >
                    <path d="M7 2h10" />
                    <path d="M5 6h14" />
                    <rect width="18" height="12" x="3" y="10" rx="2" />
                  </svg>
                </div>
                <span className="text-lg font-semibold ml-2">Vault</span>
              </div>
            </Section>

            <Heading className="text-2xl font-bold text-left mb-4">
              You've been invited!
            </Heading>
            <Text className="text-base mb-4 text-left">
              Hello {inviteeEmail},
            </Text>
            <Text className="text-base mb-6 text-left">
              <span className="font-semibold">{inviterName}</span> has invited
              you to join the{" "}
              <span className="font-semibold">{workspaceName}</span> workspace
              on Vault. Click the button below to accept the invitation and
              start collaborating.
            </Text>
            <Section className="text-left mb-8">
              <Button
                className="bg-primary text-primary-foreground px-6 py-3 rounded font-medium"
                href={url}
              >
                Accept Invitation
              </Button>
            </Section>
            <Text className="text-sm text-zinc-500 mb-8 text-left">
              If you don't want to join this workspace, you can safely ignore
              this email.
            </Text>

            <Text className="text-sm text-zinc-500 mb-8 text-left">
              If the button above doesn't work, copy and paste the following
              link into your browser:
              <br />
              <Link href={url} className="text-primary underline break-all">
                {url}
              </Link>
            </Text>

            <Hr className="border-zinc-200 my-6" />

            <Text className="text-xs text-zinc-400 text-center">
              © {new Date().getFullYear()} Vault. All rights reserved.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
