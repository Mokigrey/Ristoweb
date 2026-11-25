
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSocialLinks } from "./actions";

type SocialLinks = {
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  tripadvisor: string;
};

type SocialFormProps = {
  tenantId: string;
  initialSocial?: Partial<SocialLinks>;
};

const socialNetworks: {
  key: keyof SocialLinks;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "facebook",
    label: "Facebook",
    placeholder: "https://www.facebook.com/nomeristorante",
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://www.instagram.com/nomeristorante",
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "https://www.tiktok.com/@nomeristorante",
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://www.youtube.com/@nomeristorante",
  },
  {
    key: "tripadvisor",
    label: "Tripadvisor",
    placeholder: "https://www.tripadvisor.it/",
  },
];

export default function SocialForm({
  tenantId,
  initialSocial,
}: SocialFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const [social, setSocial] = useState<SocialLinks>({
    facebook: initialSocial?.facebook ?? "",
    instagram: initialSocial?.instagram ?? "",
    tiktok: initialSocial?.tiktok ?? "",
    youtube: initialSocial?.youtube ?? "",
    tripadvisor: initialSocial?.tripadvisor ?? "",
  });

  function aggiornaSocial(
    campo: keyof SocialLinks,
    valore: string
  ) {
    setMessage("");
    setSuccess(false);

    setSocial((precedenti) => ({
      ...precedenti,
      [campo]: valore,
    }));
  }

  function salvaSocial(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    startTransition(async () => {
      try {
        const result = await saveSocialLinks(
          tenantId,
          social
        );

        setMessage(result.message);
        setSuccess(result.success);

        if (result.success) {
          router.refresh();
        }
      } catch (error) {
        console.error(
          "Errore durante il salvataggio dei social:",
          error
        );

        setMessage(
          "Errore imprevisto durante il salvataggio."
        );
        setSuccess(false);
      }
    });
  }

  return (
    <form
      onSubmit={salvaSocial}
      className="space-y-5"
    >
      {socialNetworks.map((network) => (
        <div key={network.key}>
          <label
            htmlFor={`social-${network.key}`}
            className="mb-2 block text-sm font-medium text-gray-800"
          >
            {network.label}
          </label>

          <input
            id={`social-${network.key}`}
            type="url"
            value={social[network.key]}
            onChange={(event) =>
              aggiornaSocial(
                network.key,
                event.target.value
              )
            }
            placeholder={network.placeholder}
            className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>
      ))}

      <div className="border-t pt-5">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-700 px-6 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Salvataggio..."
            : "Salva social"}
        </button>

        {message && (
          <div
            role="status"
            className={`mt-4 rounded-lg p-4 text-sm ${
              success
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </form>
  );
}
