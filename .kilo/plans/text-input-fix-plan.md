# Text Yazma Sorunu Fix Planı

## Problem
Kullanıcı text aracını seçip canvas'a tıkladığında text oluşturamıyor.

## Analiz
Tüm text akışını (`Canvas.tsx`, `useCanvasEvents.ts`, `useKeyboardShortcuts.ts`, `rendering.ts`) inceledim. Kod yapısal olarak doğru, TypeScript derleme hatası yok. Ancak Tauri webview ortamında `focus()` güvenilir çalışmayabilir ve birkaç iyileştirme gerekiyor.

## Uygulanacak Değişiklikler

### 1. TextInputOverlay focus güvenilirliği (`src/components/Canvas.tsx`)
- `useEffect` içindeki `ref.current?.focus()` çağrısını `requestAnimationFrame` ile sarmala
- Tauri webview'da autofocus'un düzgün çalışması için bu gereklidir
- Mevcut kod (satır 197-199):
  ```tsx
  useEffect(() => {
    ref.current?.focus();
  }, []);
  ```
- Yeni kod:
  ```tsx
  useEffect(() => {
    requestAnimationFrame(() => {
      ref.current?.focus();
    });
  }, []);
  ```

### 2. Canvas mousedown'da preventDefault ekleme (`src/hooks/useCanvasEvents.ts`)
- Text tool için tıklama yapıldığında `e.preventDefault()` ekle
- Browser'ın varsayılan davranışının (metin seçimi, drag) müdahale etmesini engeller
- Mevcut kod (satır 108-118):
  ```typescript
  if (state.activeTool === "text") {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      state.setShowTextInput({...});
    }
    return;
  }
  ```
- Yeni kod: `e.preventDefault()` ekle

### 3. TextElement oluşturmada measureText import kullanımı (`src/components/Canvas.tsx`)
- Inline duplicate text measurement kodunu sil, `geometry.ts`'deki `measureText` fonksiyonunu import et
- Mevcut kod (satır 134-143) inline measurement
- Yeni kod: `import { measureText } from "../utils/geometry"` ve `measureText(text, state.fontSize)` çağrısı

### 4. Constants kullanımı (`src/components/Canvas.tsx`)
- `fontFamily: "sans-serif"` hardcoded yerine `DEFAULT_FONT_FAMILY` kullan
- Import ekle: `import { DEFAULT_FONT_FAMILY } from "../utils/constants"`

## Değiştirilecek Dosyalar
1. `src/components/Canvas.tsx` - TextInputOverlay focus fix, measureText import, constant kullanımı
2. `src/hooks/useCanvasEvents.ts` - preventDefault ekleme

## Doğrulama
- `npm run build` ile derleme kontrolü
- `npx tsc --noEmit` ile type kontrolü
