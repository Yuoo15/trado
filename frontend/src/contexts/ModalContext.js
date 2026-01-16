"use client";
import { createContext, useContext, useState, useCallback } from "react";
import Modal from "@/components/modal/Modal";
import ConfirmModal from "@/components/modal/ConfirmModal";

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState({
    isOpen: false,
    title: null,
    message: "",
    type: "info",
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: null,
    message: "",
    resolve: null,
  });

  const showModal = useCallback((message, type = "info", title = null) => {
    setModal({
      isOpen: true,
      message,
      type,
      title,
    });
  }, []);

  const hideModal = useCallback(() => {
    setModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const showSuccess = useCallback((message, title = null) => {
    showModal(message, "success", title);
  }, [showModal]);

  const showError = useCallback((message, title = null) => {
    showModal(message, "error", title || "Ошибка");
  }, [showModal]);

  const showWarning = useCallback((message, title = null) => {
    showModal(message, "warning", title || "Предупреждение");
  }, [showModal]);

  const showInfo = useCallback((message, title = null) => {
    showModal(message, "info", title || "Информация");
  }, [showModal]);

  const showConfirm = useCallback((message, title = "Подтверждение") => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback((result) => {
    if (confirmModal.resolve) {
      confirmModal.resolve(result);
    }
    setConfirmModal({
      isOpen: false,
      title: null,
      message: "",
      resolve: null,
    });
  }, [confirmModal]);

  const hideConfirm = useCallback(() => {
    handleConfirm(false);
  }, [handleConfirm]);

  return (
    <ModalContext.Provider
      value={{
        showModal,
        hideModal,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showConfirm,
      }}
    >
      {children}
      <Modal
        isOpen={modal.isOpen}
        onClose={hideModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={hideConfirm}
        onConfirm={handleConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}
