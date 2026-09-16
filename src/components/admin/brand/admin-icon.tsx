import { RynetMark } from "@/components/brand/rynet-mark";

/**
 * The Rynet mark where Payload would draw its own icon: the home link at the start of the
 * breadcrumb above every admin screen.
 *
 * Hidden from assistive technology, because the link it sits in is already named ("Home").
 * The compact drawing, because the slot is about 24px and the full trace turns to noise there.
 */
export function AdminIcon() {
  return <RynetMark className="rn-admin-icon" detail="compact" />;
}
