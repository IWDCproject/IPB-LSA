// blurWorker.js

const drawCover = (ctx, img, w, h) => {
    const r = img.width / img.height;
    const c = w / h;
    let dw, dh, dx, dy;
    if (r > c) { dh = h; dw = h * r; dx = w - dw; dy = 0; }
    else        { dw = w; dh = w / r; dx = 0;      dy = (h - dh) / 2; }
    ctx.drawImage(img, dx, dy, dw, dh);
};

const processOne = async ({ id, url, width: W, height: H }) => {
    const res    = await fetch(url);
    const blob   = await res.blob();
    const bitmap = await createImageBitmap(blob);

    const RW = Math.round(W / 2);
    const RH = Math.round(H / 2);
    const canvas = new OffscreenCanvas(RW, RH);
    const ctx    = canvas.getContext("2d");
    drawCover(ctx, bitmap, RW, RH);
    bitmap.close();

    return { id, bitmap: canvas.transferToImageBitmap() };
};

// --- concurrency limiter: max N in-flight at once ---
const withLimit = (limit, tasks) => {
    return new Promise((resolve) => {
        const results = [];
        let started = 0;
        let finished = 0;

        const next = () => {
            if (started >= tasks.length) return;
            const i = started++;
            tasks[i]().then((result) => {
                results[i] = result;
                finished++;
                if (finished === tasks.length) resolve(results);
                else next();
            });
        };

        // kick off up to `limit` tasks immediately
        for (let i = 0; i < Math.min(limit, tasks.length); i++) next();
    });
};

self.onmessage = async ({ data: { images, width, height } }) => {
    const tasks = images.map(({ id, url }) => async () => {
        try {
            const { id: rid, bitmap } = await processOne({ id, url, width, height });
            // still post each result as it finishes — don't batch them
            self.postMessage({ id: rid, bitmap }, [bitmap]);
        } catch (err) {
            self.postMessage({ id, error: err.message });
        }
    });

    await withLimit(3, tasks); // 3 concurrent is the sweet spot for Unsplash-sized images
};