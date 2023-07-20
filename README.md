# SSG 구현하기

# 1.  SSG 구현하기

NextJS에서 SSG는 `getStaticProps` 함수를 사용하여 구현을 하게 됩니다.

해당 함수는 모든 페이지 파일에 추가가 가능하고 export를 시켜줘야 합니다.

그러면 해당 페이지는 사전 렌더링을 해당 파일로 대체합니다.

```jsx
export default function Home(props: any) {
  const { products } = props;
  return (
    <ul>
      {products.map((product: any) => (
        <li key={product.id}>{product.title}</li>
      ))}
    </ul>
  );
}

export async function getStaticProps() {
  return {
    props: {
      products: [{ id: "p1", title: "product 1" }],
    },
  };
}
```

위의 코드를 실행하면 `getStaticProps` 에서 데이터를 페칭해옵니다.

즉 products 객체는 서버에서 온 것 입니다. 지금은 간단히 데이터를 추가했지만

클라이언트에서 못하는 파일에 접근하는 동작을 실행해보겠습니다.

`import fs from "fs";` 을 추가하겠습니다. fs는 Node.js의 기본 모듈인 파일 접근 라이브러리입니다.

브라우저에서는 파일 시스템에 접근이 불가능하기 때문에 클라이언트를 작업할 땐 사용하지 않습니다.

아래의 코드로 바꿔보면 `dummy-backend.json` 에 있는 데이터가 제대로 props로 넘어오는걸 확인 할 수 있습니다.

```jsx
import path from "path";
import fs from "fs";

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

export async function getStaticProps() {
  // root -> data -> dummy-backend.json 파일
  const filePath = path.join(process.cwd(), "data", "dummy-backend.json");
  const jsonData = fs.readFileSync(filePath, { encoding: "utf8", flag: "r" });
  const data = JSON.parse(jsonData);

  return {
    props: {
      ...data
    },
  };
}
```

이제 NextJS 페이지를 build를 해보겠습니다.

```bash
> next-ssg@0.1.0 build /Users/hwangtaehyeon/Desktop/study/next-ssg
> next build

- info Linting and checking validity of types  
- info Creating an optimized production build  
- info Compiled successfully
- info Collecting page data  
[    ] - info Generating static pages (0/3){
  products: [
    { id: 'p1', title: 'Product 1' },
    { id: 'p2', title: 'Product 2' },
    { id: 'p3', title: 'Product 3' }
  ]
}
- info Generating static pages (3/3)
- info Finalizing page optimization  

Route (pages)                              Size     First Load JS
┌ ● /                                      315 B            75 kB
├   /_app                                  0 B            74.6 kB
├ ○ /404                                   181 B          74.8 kB
└ λ /api/hello                             0 B            74.6 kB
+ First Load JS shared by all              75.3 kB
  ├ chunks/framework-3a322d23b038af29.js   45.2 kB
  ├ chunks/main-b20ef01ae17b68d2.js        28.4 kB
  ├ chunks/pages/_app-190faf4f53359414.js  298 B
  ├ chunks/webpack-8fa1640cc84ba8fe.js     750 B
  └ css/876d048b5dab7c28.css               706 B

λ  (Server)  server-side renders at runtime (uses getInitialProps or getServerSideProps)
○  (Static)  automatically rendered as static HTML (uses no initial props)
●  (SSG)     automatically generated as static HTML + JSON (uses getStaticProps)
```

여기서 주목해야 하는 점은 ● 입니다.

●는 지금까지 구현할려고 한 SSG입니다. 이것을 어디서 확인할 수 있는가 하면

root → .next → server → pages 폴더에 들어가면 여러 파일이 있는데 그중 .html 파일이 3가지가 있습니다.

이 중 index.html을 살펴보면 .json으로 가져온 데이터와 li태그를 미리 사전 생성되어있는걸 확인이 가능합니다.

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- 헤더 태그는 길어서 지워두도록 하겠습니다. -->
  </head>
  <body>
    <div id="__next">
      <ul>
        <li>Product 1</li>
        <li>Product 2</li>
        <li>Product 3</li>
      </ul>
    </div>
    <script id="__NEXT_DATA__" type="application/json">
      {
        "props": {
          "pageProps": {
            "products": [
              { "id": "p1", "title": "Product 1" },
              { "id": "p2", "title": "Product 2" },
              { "id": "p3", "title": "Product 3" }
            ]
          },
          "__N_SSG": true
        },
        "page": "/",
        "query": {},
        "buildId": "QxGYjQblrAMe7fx3Chkwk",
        "isFallback": false,
        "gsp": true,
        "scriptLoader": []
      }
    </script>
  </body>
</html>
```

# 2. IRS (****증분 정적 생성****)

SSG로 만들어 보았는데 이때 가장 큰 문제점은 `dummy-backend.json` 의 값이 변경이 되어도 현재 보고 있는 페이지에서 바로바로 반영이 되지 않습니다.

왜냐하면 미리 만들어진 페이지 이기 때문이죠. `getStaticProps` 에서 서버사이드 코드를 실행할 수 있지만 결국 코드는 build 될 때 컴퓨터에서 실행이 되는 겁니다.
결국은 데이터가 변경 될 때 마다 다시 빌드 후 배포를 해야하는데 정말 비효율적입니다.

그래서 NextJS는 이에 대한 몇가지 해결책을 가지고 있습니다.

1. 서버에서 만들어진 페이지로 렌더링 후 완전히 렌더링 된 후 클라이언트에서 다시 데이터를 가져오는 방법
2. `getServerSideProps` 사용하기
3. IRS 사용하기

3가지 방법은 결론적으로는 똑같습니다.

페이지를 빌드할 때 정적으로 한 번만 생성하는게 아닌 계속 업데이트를 시키는겁니다.

IRS는 일정 시간을 지정해서 지속적으로 서버에서 페이지를 재생성 합니다.

즉 60초라는 시간을 지정했을 때 60초가 지나지 않으면 이전 페이지를, 60초가 지나면 새로운 데이터가 반영된 페이지를 보여주는 것 입니다.

```jsx
import path from "path";
import fs from "fs";

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

export async function getStaticProps() {
	console.log("Re Render Data");
  // root -> data -> dummy-backend.json 파일
  const filePath = path.join(process.cwd(), "data", "dummy-backend.json");
  const jsonData = fs.readFileSync(filePath, { encoding: "utf8", flag: "r" });
  const data = JSON.parse(jsonData);

  return {
    props: {
      ...data
    },
		// 10초마다 페이지 재생성
		revalidate: 10,
  };
}
```

이후 빌드 후 json 파일을 직접 변경할 경우 제대로 반영되는걸 확인할 수 있습니다.

다만 react-query나 swr같은 라이브러리를 사용하면 revalidate를 사용하지 않아도 됩니다.