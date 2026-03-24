# Mermaid State Diagram Desteği

## Özet
rdraw uygulamasına Mermaid state diagram desteği ekle. Mevcut flowchart ve sequence diagram desteğine ek olarak state diagramlar da render edilebilecek.

## Değişiklikler

### 1. `src/utils/mermaid.ts`

**a) `MermaidRenderResult` interface** (satır 38):
```typescript
// ÖNCE
diagramType: "flowchart" | "sequence";
// SONRA
diagramType: "flowchart" | "sequence" | "state";
```

**b) `renderMermaidDiagram` fonksiyonu** (satır 45-46):
```typescript
// ÖNCE
const diagramType: "flowchart" | "sequence" =
  parseInfo.diagramType === "sequence" ? "sequence" : "flowchart";
// SONRA
let diagramType: "flowchart" | "sequence" | "state";
if (parseInfo.diagramType === "sequence") diagramType = "sequence";
else if (parseInfo.diagramType === "state") diagramType = "state";
else diagramType = "flowchart";
```

**c) `parseMermaidSVG` fonksiyon signature** (satır 54):
```typescript
// ÖNCE
function parseMermaidSVG(svgString: string, diagramType: "flowchart" | "sequence"): MermaidRenderResult {
// SONRA
function parseMermaidSVG(svgString: string, diagramType: "flowchart" | "sequence" | "state"): MermaidRenderResult {
```

**d) `parseMermaidSVG` içindeki branching** (satır 72-78):
State diagram SVG yapısı flowchart'a çok benzer (g.node grupları, g.edgePaths, g.edgeLabels). Mevcut `extractNodes`/`extractEdges` fonksiyonları doğrudan çalışır. Sadece branching'e state'i flowchart ile aynı kola eklemek yeterli:
```typescript
if (diagramType === "sequence") {
  nodes = extractSequenceNodes(svgEl);
  edges = extractSequenceEdges(svgEl);
} else {
  // flowchart ve state aynı extractor'ı kullanır
  nodes = extractNodes(svgEl);
  edges = extractEdges(svgEl);
}
```

**e) `extractNodes` içinde stadium/doublecircle shape detection** (satır ~134):
State diagram'lerde `[*]` başlangıç/bitiş durumları small circle olarak render edilir. Mevcut `ellipse` detection bunu zaten yakalar. `stadium` shape de mevcut detection'da `rx > 0` corner check ile çalışır. Ek değişiklik gerekmez.

### 2. `src/components/Canvas.tsx`

**a) Hata mesajı** (satır 159):
```typescript
// ÖNCE
alert("Geçersiz Mermaid kodu. Lütfen flowchart veya sequence diagram syntax'ını kontrol edin.");
// SONRA
alert("Geçersiz Mermaid kodu. Lütfen flowchart, sequence veya state diagram syntax'ını kontrol edin.");
```

**b) Placeholder metni** (satır 355):
State diagram örnekleri ekle:
```typescript
// ÖNCE
placeholder={"flowchart TD\n    A[Start] --> B[End]\n\nor sequence diagram:\n\nsequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi"}
// SONRA
placeholder={"flowchart TD\n    A[Start] --> B[End]\n\nsequence diagram:\n\nsequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi\n\nstate diagram:\n\nstateDiagram-v2\n    [*] --> Still\n    Still --> [*]\n    Still --> Moving\n    Moving --> Still\n    Moving --> Crash\n    Crash --> [*]"}
```

## Dosya Özet

| Dosya | Değişiklik |
|-------|-----------|
| `src/utils/mermaid.ts` | `diagramType` union'a `"state"` ekle, detection logic güncelle |
| `src/components/Canvas.tsx` | Hata mesajı ve placeholder güncelle |

## Test Senaryosu
Mermaid tool ile canvas'a şu state diagram gir:
```
stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]
```

## Notlar
- State diagram SVG yapısı flowchart ile neredeyse aynı → mevcut node/edge extraction doğrudan çalışır
- `rendering.ts` ve `export.ts` dosyalarında `diagramType` branch'i yok, doğrudan `renderedNodes`/`renderedEdges` kullanıyor → değişiklik gerekmez
