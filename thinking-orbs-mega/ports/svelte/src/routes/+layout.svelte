<script lang="ts">
import "./layout.css";

const { children } = $props();
</script>

<div class="contents" data-theme="dark">
	{@render children()}
</div>
