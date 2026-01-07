export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/map",
      permanent: false,
    },
  };
}

export default function Home() {
  return null;
}