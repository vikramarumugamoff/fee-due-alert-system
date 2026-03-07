import logo from "../assets/fee-alert-logo.svg";

export default function BrandLogo({ size = 40, className = "" }) {
  return (
    <img
      src={logo}
      alt="Fee Due Alert System logo"
      width={size}
      height={size}
      className={className}
      loading="lazy"
    />
  );
}
