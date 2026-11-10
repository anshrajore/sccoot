export default function PreviewRedirect() {
  return (
    <div>
      <h1>Side-by-side studio</h1>
      <p>
        Stitch screens sit on the left; the implemented Scoot UI sits on the right. Serve the repo root so image paths
        resolve.
      </p>
      <p>
        Open{" "}
        <a href="http://127.0.0.1:8765/apps/preview/index.html" target="_blank" rel="noreferrer">
          http://127.0.0.1:8765/apps/preview/index.html
        </a>
      </p>
      <iframe
        title="Scoot preview"
        src="http://127.0.0.1:8765/apps/preview/index.html"
        style={{ width: "100%", height: "90vh", border: 0, borderRadius: 24, background: "#17131F" }}
      />
    </div>
  );
}
