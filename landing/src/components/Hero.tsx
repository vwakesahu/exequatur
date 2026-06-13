"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "motion/react";
import { vertexShader, fragmentShader } from "@/shaders/shaders";

export default function Hero() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setDimensions({ width, height });
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    const t = setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      clearTimeout(t);
    };
  }, []);

  // Smoothed custom cursor.
  useEffect(() => {
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };
    const lerp = (a: number, b: number, f: number) => (1 - f) * a + f * b;
    const tick = () => {
      currentX = lerp(currentX, targetX, 0.1);
      currentY = lerp(currentY, targetY, 0.1);
      setPosition({ x: currentX, y: currentY });
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return;
    const isMobile = dimensions.width < 768;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, dimensions.width / dimensions.height, 0.1, 100);
    cameraRef.current = camera;
    camera.position.z = isMobile ? 2 : 1.5;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    rendererRef.current = renderer;
    renderer.setSize(dimensions.width, dimensions.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const geometry = new THREE.IcosahedronGeometry(isMobile ? 1.8 : 2.25, isMobile ? 24 : 48);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uTime: { value: 0 }, uColorChange: { value: 0.3 } },
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    meshRef.current = mesh;
    mesh.position.z = isMobile ? 0 : -1.1;
    scene.add(mesh);

    gsap.registerPlugin(ScrollTrigger);
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".landing",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5,
        immediateRender: false,
      },
    });

    tl.to(camera.position, { z: isMobile ? 4 : 3, duration: 2, ease: "power1.inOut" })
      .to(material.uniforms.uColorChange, { value: 0, duration: 2, ease: "power1.inOut" }, "<")
      .to(".landing h1", { opacity: 0, y: -50, duration: 1, ease: "power1.out" })
      .to(mesh.rotation, { x: Math.PI * 0.25, y: Math.PI * 0.25, duration: 2, ease: "power1.inOut" })
      .to(mesh.position, { z: -1.5, duration: 2, ease: "power1.inOut" }, "<")
      .to(".landing p", { opacity: 1, y: 0, duration: 1, ease: "power1.out" }, "-=1");

    const clock = new THREE.Clock();
    let previousTime = 0;
    let raf = 0;
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const delta = elapsed - previousTime;
      previousTime = elapsed;
      if (meshRef.current) {
        meshRef.current.rotation.x += delta * 0.1;
        meshRef.current.rotation.y += delta * 0.15;
      }
      material.uniforms.uTime.value = elapsed;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      tl.scrollTrigger?.kill();
      tl.kill();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [dimensions]);

  return (
    <div className="w-full">
      <motion.div
        className="fixed pointer-events-none z-50 hidden md:flex mix-blend-difference"
        style={{ x: position.x - 20, y: position.y - 20 }}
        animate={{ scale: isHovering ? 3 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
      >
        <div className="h-[40px] w-[40px] rounded-full bg-white" />
      </motion.div>

      <div className="landing w-full h-[400vh]">
        <div className="sticky top-0 left-0 h-screen w-full">
          <h1
            className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 cursor-default px-2 text-center font-display text-3xl font-bold tracking-tighter text-foreground md:whitespace-nowrap md:text-6xl lg:text-8xl"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            Scoped.Verified.Enforced
          </h1>
          <p
            className="pointer-events-none absolute left-1/2 top-1/2 z-50 w-full max-w-full -translate-x-1/2 -translate-y-1/2 px-4 text-center text-sm leading-loose tracking-tight text-muted-foreground opacity-0 md:max-w-xl md:text-lg lg:text-xl"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            exequatur is a firewall for autonomous payment agents. Hand an agent a capped spending
            delegation, and every payment still has to clear a Venice policy check and an on-chain
            enforcer before a single token can move.
          </p>
          <div className="pointer-events-none relative h-screen w-full">
            <canvas ref={canvasRef} className="pointer-events-none absolute -z-50 h-full w-full max-w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
