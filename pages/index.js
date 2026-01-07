import Link from "next/link";

export default function Home() {
  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>ArchaeoRest</h1>
      <p>Welcome</p>
      <Link href="/map">Go to map</Link>
    </div>
  );
}