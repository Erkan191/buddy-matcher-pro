import Image from "next/image";

export default function BrandLogo({ className = "" }) {
  const classes = ["brand-logo", className].filter(Boolean).join(" ");

  return (
    <span className={classes}>
      <Image
        className="brand-logo-image"
        src="/brand/buddy-matcher-logo.png"
        alt="Buddy Matcher"
        width={960}
        height={335}
        sizes="(max-width: 700px) 145px, 175px"
      />
    </span>
  );
}
