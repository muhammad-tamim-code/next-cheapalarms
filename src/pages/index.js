/**
 * Customer marketing pages live elsewhere (Astro). This Next app hosts the
 * portal + admin/business UI; the bare domain just routes visitors to the
 * minimal quote form so testing can begin immediately.
 */
export default function HomeRedirect() {
  return null;
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/quote",
      permanent: false,
    },
  };
}
