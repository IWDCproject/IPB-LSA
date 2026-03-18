// worker hanya decode gambar, kirim bitmap mentah ke main thread
// cover scaling dikerjain CSS object-fit di main thread, bukan di sini

const processOne = async ({ id, url }) => {
    const res    = await fetch(url);
    const blob   = await res.blob();
    const bitmap = await createImageBitmap(blob);
    return { id, bitmap };
};

self.onmessage = async ({ data: { images } }) => {
    await Promise.all(
        images.map(async ({ id, url }) => {
            try {
                const { id: rid, bitmap } = await processOne({ id, url });
                self.postMessage({ id: rid, bitmap }, [bitmap]);
            } catch (err) {
                self.postMessage({ id, error: err.message });
            }
        })
    );
};