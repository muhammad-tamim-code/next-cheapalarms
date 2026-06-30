/**
 * Customer marketing pages live elsewhere (Astro). This Next app hosts the
 * portal + admin UI; the bare domain sends visitors to sign-in.
 */
export default function HomeRedirect() {
  return null;
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/login",
      permanent: false,
    },
  };
}
