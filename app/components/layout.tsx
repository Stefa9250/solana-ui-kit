import { Sidebar } from "@/components/docs/sidebar";

/** Docs shell for every /components/* page: sidebar nav + center-stage content. */
export default function ComponentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
