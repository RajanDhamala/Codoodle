import { useEffect, useRef, useState, type ReactNode } from "react";
import useUserStore from "../UserStore";
import useSocketStore from "../SocketStore";
import { createSocket } from "../Utils/socket";
import type { GuestProfile } from "../Utils/guestProfile";
import { useRoomHost } from "../hooks/useRoomHost";
import { GuestProfileSetup } from "./GuestProfileSetup";
import RoomHostControls from "./RoomHostControls";

export default function CreateRoomModal({
  closeButton,
  onCreatingChange,
}: {
  closeButton: ReactNode;
  onCreatingChange: (creating: boolean) => void;
}) {
  const guestProfile = useUserStore((state) => state.guestProfile);
  const setGuestProfile = useUserStore((state) => state.setGuestProfile);
  const clearCurrentUser = useUserStore((state) => state.clearCurrentUser);
  const host = useRoomHost();
  const [isProfileOpen, setIsProfileOpen] = useState(() => !guestProfile);
  const profileDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    onCreatingChange(host.isCreating);
  }, [host.isCreating, onCreatingChange]);

  useEffect(() => {
    if (isProfileOpen) profileDialog.current?.showModal();
  }, [isProfileOpen]);

  const closeProfile = () => {
    profileDialog.current?.close();
    setIsProfileOpen(false);
  };

  const saveProfile = (profile: GuestProfile) => {
    setGuestProfile(profile);
    clearCurrentUser();
    const { socketInstance, clearSocketInstance, setSocketInstance } = useSocketStore.getState();
    socketInstance?.disconnect();
    clearSocketInstance(socketInstance);
    setSocketInstance(createSocket());
    closeProfile();
  };

  return (
    <>
      <RoomHostControls
        {...host}
        isModal
        guestProfile={guestProfile}
        titleId="create-room-title"
        headerAction={closeButton}
        resetProfile={() => setIsProfileOpen(true)}
        createRoom={() => host.createRoom(() => setIsProfileOpen(true))}
      />
      {isProfileOpen && (
        <dialog
          ref={profileDialog}
          className="player-setup-dialog"
          aria-labelledby="player-setup-title"
          onCancel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            // Use the editor's close action so unsaved changes still get confirmed.
            profileDialog.current?.querySelector<HTMLButtonElement>(".player-setup-dialog__close")?.click();
          }}
        >
          <GuestProfileSetup
            variant="modal"
            initialProfile={guestProfile}
            onSave={saveProfile}
            onClose={closeProfile}
          />
        </dialog>
      )}
    </>
  );
}
