import { Sidebar } from "@/components/docs/sidebar";
import { getStars } from "@/lib/github";

/** Docs shell for every /components/* page: sidebar nav + center-stage content. */
export default async function ComponentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const stars = await getStars();
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Sidebar stars={stars} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
