//! Compile-check of the README “Usage” surface.
//!
//! ```bash
//! cargo build --example readme_usage
//! ```
//!
//! This does not open a window; it only ensures the public builder API type-checks
//! against the same imports a consumer would copy from the README.

use gpui::AppContext;
use gpui_thinking_orbs::{OrbSize, OrbState, OrbTheme, ThinkingOrb};

fn usage(cx: &mut gpui::App) -> gpui::Entity<ThinkingOrb> {
    cx.new(|_| {
        ThinkingOrb::new()
            .state(OrbState::Searching)
            .size(OrbSize::Avatar)
            .theme(OrbTheme::Auto)
            .speed(1.0)
            .target_fps(30.0)
            .pause_when_inactive(true)
            .visible(true)
    })
}

fn main() {
    let _ = usage as fn(&mut gpui::App) -> _;
}
