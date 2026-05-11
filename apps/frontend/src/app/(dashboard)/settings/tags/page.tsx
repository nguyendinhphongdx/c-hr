import { createMetadata } from "@/lib/seo";

import { TagsSettingsView } from "./view";

export const metadata = createMetadata({
  title: "Tags",
  path: "/settings/tags",
  noIndex: true,
});

export default function TagsSettingsPage() {
  return <TagsSettingsView />;
}
