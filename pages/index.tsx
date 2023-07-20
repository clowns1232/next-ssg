import path from "path";
import fs from "fs";
import { GetStaticPropsContext } from "next";

export default function Home(props: any) {
  const { products } = props;
  console.log(props);

  return (
    <ul>
      {products.map((product: any) => (
        <li key={product.id}>{product.title}</li>
      ))}
    </ul>
  );
}

export async function getStaticProps(context: GetStaticPropsContext) {
  console.log("Re Render Data");

  // root -> data -> dummy-backend.json 파일
  const filePath = path.join(process.cwd(), "data", "dummy-backend.json");
  const jsonData = fs.readFileSync(filePath, { encoding: "utf8", flag: "r" });
  const data = JSON.parse(jsonData);

  return {
    props: {
      ...data,
    },
    revalidate: 10,
    redirect: {
      destination: "/test",
      permanent: true,
      statusCode: 301
    },
  };
}
