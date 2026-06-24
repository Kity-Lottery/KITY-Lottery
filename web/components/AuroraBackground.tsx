/**
 * AuroraBackground — the app-wide ambient field. A drifting aurora mesh, the
 * legacy blur-orbs, a faint dot grid, and a film-grain overlay layered on the
 * deep navy base. Fixed, non-interactive, sits behind all content.
 */
export function AuroraBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none grain">
      <div className="aurora" />
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />
      <div className="bg-grid opacity-[0.5]" />
    </div>
  );
}
