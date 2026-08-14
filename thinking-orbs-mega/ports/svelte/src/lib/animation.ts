type FrameSubscriber = (time: number) => void;

const subscribers = new Set<FrameSubscriber>();
let animationFrame = 0;

function loop(time: number) {
	for (const subscriber of subscribers) subscriber(time / 1000);
	animationFrame = subscribers.size ? requestAnimationFrame(loop) : 0;
}

export function subscribeFrame(subscriber: FrameSubscriber): () => void {
	subscribers.add(subscriber);
	if (!animationFrame) animationFrame = requestAnimationFrame(loop);
	return () => {
		subscribers.delete(subscriber);
		if (!subscribers.size && animationFrame) {
			cancelAnimationFrame(animationFrame);
			animationFrame = 0;
		}
	};
}
