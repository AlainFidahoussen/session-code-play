import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cohort — Practice Coding Problems" },
      {
        name: "description",
        content:
          "Practice coding problems, graded like LeetCode. Sign in and your solutions are saved to your account.",
      },
      { property: "og:title", content: "Cohort — Practice Coding Problems" },
      {
        property: "og:description",
        content: "Pick a problem, write Python, and grade it against visible and hidden tests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workspace,
});
