import { getPaymentService } from "@/lib/stripeServer";

export async function POST(request) {
  return getPaymentService().webhook(request);
}
