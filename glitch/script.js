class NavigationEffect {
  constructor(config) {
    this.config = config;
    this.navigation = this.config.navElement;
    this.anchors = this.navigation.querySelectorAll("a");
    this.tlByAnchor = new WeakMap();

    this.anchors.forEach((anchor) => {
      this.registerTimelines(anchor);
      const timelines = this.tlByAnchor.get(anchor);

      anchor.addEventListener("mouseenter", () => {
        this.playMouseEnterAnimations(timelines);
      });

      anchor.addEventListener("mouseleave", () => {
        if (!anchor.classList.contains("active")) {
          this.playMouseLeaveAnimations(timelines);
        }
      });

      anchor.addEventListener("click", () => {
        const current = document.querySelector(".active");
        if (current && current !== anchor) {
          this.playMouseLeaveAnimations(this.tlByAnchor.get(current));
          current.classList.remove("active");
        }

        anchor.classList.add("active");
        this.playActiveAnimations(timelines);
      });
    });
  }

  playMouseEnterAnimations(timelines) {
    timelines.text.timeScale(1).play();
    timelines.displacement.timeScale(1).play();
    timelines.scanline.timeScale(1).play();
    timelines.scanlinePattern.timeScale(1).play();
  }

  playMouseLeaveAnimations(timelines) {
    timelines.text.timeScale(2).reverse();
    timelines.displacement.timeScale(2).reverse();
    timelines.displacementActive.pause(0);
    timelines.scanline.pause(0);
    timelines.scanlinePattern.pause(0);
    timelines.active.timeScale(1).reverse();
  }

  playActiveAnimations(timelines) {
    timelines.active.timeScale(1).play();
    timelines.displacementActive.timeScale(1).play();
  }

  registerTimelines(anchor) {
    const container = anchor.querySelector("svg");
    const text = anchor.querySelector("text.red");
    const blueText = anchor.querySelector("text.blue");
    const displacement = anchor.querySelector(".displace");
    const scanline = anchor.querySelector(".scanline");
    const scanlinePattern = anchor.querySelector(".scanline-pattern");
    const activeElement = anchor.querySelectorAll(".fill");
    const startX = Number(text.getAttribute("x"));
    const centerX =
      (container.getBBox().width - text.getBBox().width) / 2 - startX;

    const { duration, easeIn, secondaryEaseIn, easeOut } = this.config;

    const tween = {
      ease: easeIn,
      easeReverse: easeOut,
      duration
    };

    const timeline = (options = {}) =>
      gsap.timeline({
        paused: true,
        ...options
      });

    const timelines = {
      text: timeline(),
      active: timeline(),
      scanline: timeline(),
      scanlinePattern: timeline(),
      displacement: timeline(),
      displacementActive: timeline({
        repeat: -1,
        repeatDelay: 2,
        repeatRefresh: true
      })
    };

    timelines.text.to(text, {
      x: centerX,
      ...tween
    });

    timelines.displacement
      .to(displacement, {
        attr: { scale: () => this.randomFloat(0.08, 2) },
        ease: easeIn,
        duration
      })
      .to(
        displacement,
        {
          attr: { scale: 0 },
          ease: easeIn,
          duration: 0.3
        },
        duration
      );

    timelines.displacementActive
      .to(displacement, {
        attr: {
          scale: () => this.randomFloat(0.08, 0.4)
        },
        ease: easeIn,
        duration: 0.5
      })
      .to(displacement, {
        attr: { scale: 0 },
        ease: easeIn,
        duration: () => this.randomFloat(0.05, 0.1),
        onRepeat: () => {
          timelines.displacementActive
            .getChildren()[1]
            .duration(this.randomFloat(0.05, 0.1));
        }
      });

    timelines.text.to(
      blueText,
      {
        x: centerX,
        ...tween
      },
      "0.1"
    );

    timelines.active.to(activeElement[1], {
      attr: { height: 50 },
      ...tween
    });

    timelines.active.to(
      activeElement[0],
      {
        attr: { height: 50 },
        ...tween
      },
      "<0.04"
    );

    timelines.scanline.to(
      scanline,
      {
        fill: "#521d20",
        ...tween
      },
      0
    );

    timelines.scanline.to(
      scanline,
      {
        opacity: 0.3,
        ease: easeIn,
        duration: 0.1,
        repeat: -1
      },
      0
    );

    timelines.scanlinePattern.to(scanlinePattern, {
      attr: { y: 10 },
      duration: 0.65,
      ease: "none",
      repeat: -1
    });

    this.tlByAnchor.set(anchor, timelines);
  }

  randomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(EasePack);

  const config1 = {
    navElement: document.getElementById("nav-1"),
    easeIn: RoughEase.ease.config({ strength: 5, points: 10 }),
    easeOut: "power2.out",
    duration: 0.3
  };

  new NavigationEffect(config1);
});
