// worker decode + blur gambar sebelum dikirim ke main thread
// main thread tinggal transferFromImageBitmap, nggak ada CSS filter

const BLUR_RADIUS = 24;

const processOne = async ({ id, url }) => {
  const res    = await fetch(url);
  const blob   = await res.blob();
  const sharp  = await createImageBitmap(blob);

  // blur dikerjain di sini pakai OffscreenCanvas
  // hasilnya bitmap flat, GPU nggak perlu ngitung ulang tiap frame
  const oc  = new OffscreenCanvas(sharp.width, sharp.height);
  const ctx = oc.getContext("2d");
  ctx.filter = `blur(${BLUR_RADIUS}px)`;
  ctx.drawImage(sharp, 0, 0);
  const blurred = oc.transferToImageBitmap();

  return { id, sharp, blurred };
};

self.onmessage = async ({ data: { images } }) => {
  await Promise.all(
    images.map(async ({ id, url }) => {
      try {
        const { id: rid, sharp, blurred } = await processOne({ id, url });
        self.postMessage({ id: rid, sharp, blurred }, [sharp, blurred]);
      } catch (err) {
        self.postMessage({ id, error: err.message });
      }
    })
  );
};