"use client";

import { useEffect, useRef } from "react";
import { trackUsageEvent } from "@/lib/usageAnalytics";

const reasons = [
  ["one_time_use", "I only needed it once"],
  ["another_tool", "I already use another tool"],
  ["features_not_needed", "I don’t need the Pro features"],
  ["account_required", "I don’t want to create an account"],
  ["payment_issue", "Payment issue"],
  ["other", "Other"],
];

export default function ProFeedback({ reason, onClose }) {
  const dialog = useRef(null);
  const submitted = useRef(false);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element.showModal();
    return () => { element.close(); previous?.focus?.(); };
  }, []);

  function respond(response) {
    if (submitted.current) return;
    submitted.current = true;
    void trackUsageEvent("pro_decline_feedback", { source: "pro_modal", reason, response });
    onClose();
  }

  return (
    <dialog ref={dialog} className="pro-modal pro-feedback" aria-labelledby="pro-feedback-title"
      onCancel={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }}>
      <div>
        <h3 id="pro-feedback-title">Why not?</h3>
        <p className="pro-modal-small">Optional — one quick answer helps us improve Pro.</p>
        <div className="feedback-options">
          {reasons.map(([value, label]) => <button key={value} type="button" className="btn btn-outline-secondary" onClick={() => respond(value)}>{label}</button>)}
        </div>
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Skip and return to the tool</button>
      </div>
    </dialog>
  );
}
