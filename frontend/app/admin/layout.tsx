// This overrides the root layout for all /admin pages
// No Navbar or Footer — clean admin panel only

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}