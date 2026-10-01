export interface IMessageSender {
  sendTextMessage(to: string, message: string): Promise<boolean>;
  sendButtonMessage(
    to: string,
    title: string,
    buttons: Array<{ id: string; label: string }>
  ): Promise<boolean>;
}
