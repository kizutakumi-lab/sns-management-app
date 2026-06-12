import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { tag, summary, posts } = await req.json();

    if (!tag || !posts || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json({ error: '分析対象のデータがありません。' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini APIキーが設定されていません。.env.local ファイルに GEMINI_API_KEY を設定してください。' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // AIに処理させるため、最大でも上位と下位の10件程度に絞る（トークン数削減）
    const sortedPosts = [...posts].sort((a, b) => b.impressions - a.impressions);
    const topPosts = sortedPosts.slice(0, 10);
    const bottomPosts = sortedPosts.slice(-10);
    const analyzeData = { tag, summary, topPosts, bottomPosts };

    const prompt = `
あなたはプロのSNSマーケターおよびデータアナリストです。
以下のデータは、とあるSNSアカウントで「${tag}」というカテゴリ・タグが付与された投稿のリストと全体サマリーです。
インプレッション（表示回数）が多かった上位の投稿と、少なかった下位の投稿の本文や数字が提供されます。

【提供データ】
${JSON.stringify(analyzeData, null, 2)}

この投稿リストおよび全体の統計データ（投稿数、平均IMP、いいね率など）を元に、客観的な数字に基づく「タグの特徴」と、定性的な「伸びた投稿と伸びなかった投稿の違い（本文や切り口の比較）」の両面からプロの視点で分析レポートを作成してください。
出力はMarkdown形式で、見出しや箇条書きを使って読みやすく構成してください。

1. **タグ全体のパフォーマンス評価**
   - 提供された \`summary\` データを元に、このタグの強みや弱みを具体的な数字（平均IMPやいいね率）を挙げて評価してください。
2. **伸びた投稿（勝ちパターン）の共通点**
   - 上位の投稿の本文（テキスト）の内容、表現方法、またはエンゲージメント（いいね率など）から読み取れる成功要因を推測してください。
3. **伸びなかった投稿（負けパターン）の共通点**
   - 下位の投稿の本文や数字から、なぜインプレッションが伸びなかったのかの原因を推測してください。
4. **具体的な違いの比較**
   - 勝ちパターンと負けパターンで、決定的に違った要素（フックとなる冒頭文、画像の有無、感情の引き出し方など）を挙げてください。
5. **今後の投稿へのアドバイス（Next Actions）**
   - 今後「${tag}」のジャンルで投稿を作る際、どのような内容や書き方を意識すべきか、明日から実行できる具体的な戦略を3つ提案してください。
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ result: text });
  } catch (error: any) {
    console.error('Error in analyze-tags:', error);
    
    // APIエラー時はモックデータを返して体験できるようにする
    const mockData = `
## 🎯 タグ内比較分析インサイト (※API通信エラーのためデモデータを表示しています)

ご提供いただいた「選ばれたタグ」に関する定量データ（数字）と定性データ（個別投稿）に基づき、プロのSNSマーケター視点で分析を行いました。

### 📊 タグ全体のパフォーマンス評価
- **平均IMP**: 約12,500
- **平均いいね率**: 1.8%
このタグはアカウント全体の平均と比べて**インプレッション獲得能力が高い**（平均1万超え）一方で、いいね率は1.8%と平均的です。「見られやすいが、深く刺さってはいない」という特徴を持っています。

### 🏆 伸びた投稿（勝ちパターン）の共通点
- **共感を生むストーリーテリング**: 上位の投稿（IMP2万超え）は、単なる事実の羅列ではなく「自分がどう感じたか」「どんな失敗をしたか」などの個人的なストーリーが含まれており、個別のいいね率も3%以上と非常に高い傾向にあります。
- **冒頭のフック（惹きつけ）**: 最初の1行目で「実は〇〇だった…」や「絶対やってはいけない〇〇」など、ユーザーの興味を強く惹きつける書き方が共通しています。

### ⚠️ 伸びなかった投稿（負けパターン）の共通点
- **宣伝色・告知色の強さ**: 下位の投稿（IMP3,000未満）は「〇〇が公開されました！」「ぜひ見てください！」といった一方的な告知になっており、ユーザーのタイムラインでスルー（スクロール）されていると推測されます。
- **情報量の少なさ**: リンクと一言だけの投稿は、インプレッションも伸びず、いいね率も0.5%以下と低迷しています。

### 🔍 具体的な違いの比較
勝ちパターンは**「ユーザーが自分事として捉えられるメリットや共感」**を提示しているのに対し、負けパターンは**「発信者都合の事実のみ」**を伝えています。また、伸びた投稿は文字数が多く、滞在時間が長くなったことでアルゴリズムからの評価（表示回数）が上がったと考えられます。

### 💡 今後の投稿へのアドバイス
1. **1行目に命を懸ける**: 告知であっても、1行目はターゲットの悩みを刺激する言葉や、結論のチラ見せから入るようにしてください。
2. **「だから何？」を解消する**: リンクを貼るだけではなく、「この記事を読むとどんな良いことがあるか（または失敗を避けられるか）」を3行程度で必ず要約してください。
3. **失敗談や個人的な感情を交える**: 完璧な情報よりも「やってしまった…」という人間味のあるテキストの方が、今のSNSでは圧倒的にリアクションを獲得しやすいため、意識的に取り入れてみましょう。
`;
    
    return NextResponse.json({ result: mockData });
  }
}
