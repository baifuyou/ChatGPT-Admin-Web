import styles from "./auth.module.scss";
import {IconButton} from "../button/button";

import {NavigateFunction, useNavigate} from "react-router-dom";
import {Path} from "../../constant";

import Locale from "../../locales";

import BotIcon from "../../icons/bot.svg";
import React, {FormEvent, useCallback, useState} from "react";

import usePreventFormSubmit from "@/app/hooks/use-prevent-form";
import {useUserStore} from "@/app/store";
import {Input, showToast} from "@/app/components/ui-lib/ui-lib";
import Locales from "@/app/locales";
import {
  apiUserLoginGet,
  apiUserLoginGetTicket,
  apiUserLoginPost,
  apiUserRegister,
  apiUserRegisterCode,
} from "@/app/api";
import {serverStatus} from "@caw/types";
import useIntervalAsync from "@/app/hooks/use-interval-async";
import {Loading} from "@/app/components/loading";
import Image from "next/image";

const emailService = process.env.NEXT_PUBLIC_EMAIL_SERVICE;

const PhoneLogin: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  const [isSubmitting, handleSubmit] = usePreventFormSubmit();
  const [isCodeSubmitting, handleCodeSubmit] = usePreventFormSubmit();

  const updateSessionToken = useUserStore((state) => state.updateSessionToken);

  const handleCode = async (event: FormEvent | undefined) => {
    if (!phone) return showToast(Locales.User.PleaseInput(Locales.User.Phone));

    const res = await apiUserRegisterCode("phone", phone);

    switch (res.status) {
      case serverStatus.success: {
        return showToast(Locales.User.Code + Locales.User.Sent);
      }
      case serverStatus.notExist: {
        return showToast(Locales.User.NotYetRegister);
      }
      case serverStatus.wrongPassword: {
        return showToast(Locales.User.PasswordError);
      }
      default: {
        return showToast(Locales.User.PasswordError);
      }
    }
  };

  const handleLogin = async (e: FormEvent | undefined) => {
    if (!phone || !code)
      return showToast(
        Locales.User.PleaseInput(`${Locales.User.Phone}, ${Locales.User.Code}`),
      );

    const res = await apiUserRegister({phone: phone, verificationCode: code});

    switch (res.status) {
      case serverStatus.success: {
        showToast(Locales.User.Success(Locales.User.Login));
        updateSessionToken(res.signedToken.token, res.signedToken.expiredAt);
        navigate(Path.Chat);
        break;
      }
      case serverStatus.notExist: {
        showToast(Locales.User.NotYetRegister);
        break;
      }
      case serverStatus.wrongPassword: {
        showToast(Locales.User.PasswordError);
        break;
      }
      default: {
        showToast(Locales.Error.Unknown);
        break;
      }
    }
  };

  return (
    <div className={styles["form-container"]}>
      <div className={styles["row"]}>
        <input
          type="text"
          id="phone"
          value={phone}
          className={styles["auth-input"]}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={Locales.User.Phone}
          required
        />
        <IconButton
          text={isCodeSubmitting ? Locales.User.Sent : Locales.User.GetCode}
          type="primary"
          onClick={() => handleCodeSubmit(undefined, handleCode)}
        />
      </div>
      <div className={styles["row"]}>
        <input
          type="text"
          id="code"
          value={code}
          className={styles["auth-input"]}
          onChange={(e) => setCode(e.target.value)}
          placeholder={Locales.User.Code}
          required
        />
      </div>
      <div className={styles["auth-actions"]}>
        <IconButton
          onClick={() => handleSubmit(undefined, handleLogin)}
          text={`${Locales.User.Login} / ${Locales.User.Register}`}
          type="primary"
        />
      </div>
    </div>
  );
};

const EmailLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, handleSubmit] = usePreventFormSubmit();
  /* Prevent duplicate form submissions */
  const updateSessionToken = useUserStore((state) => state.updateSessionToken);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!email || !password)
      return showToast(
        Locales.User.PleaseInput(
          `${Locales.User.Email}, ${Locales.User.Password}`,
        ),
      );

    const res = await apiUserLoginPost(email, password);

    switch (res.status) {
      case serverStatus.success: {
        updateSessionToken(res.signedToken.token, res.signedToken.expiredAt);
        showToast(Locales.User.Success(Locales.User.Login));
        return navigate(Path.Chat);
      }
      case serverStatus.notExist: {
        return showToast(Locales.User.NotYetRegister);
      }
      case serverStatus.wrongPassword: {
        return showToast(Locales.User.PasswordError);
      }
      default: {
        return showToast(Locales.User.PasswordError);
      }
    }
  };

  return (
    <div className={styles["form-container"]}>
      <div className={styles["row"]}>
        <input
          type="text"
          id="email"
          value={email}
          className={styles["auth-input"]}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={Locales.User.Email}
          required
        />
      </div>

      <div className={styles["row"]}>
        <input
          type="password"
          id="password"
          value={password}
          className={styles["auth-input"]}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={Locales.User.Password}
          required
        />
      </div>

      <div className={styles["auth-actions"]}>
        <IconButton text={Locale.Auth.Confirm} type="primary"/>
      </div>
    </div>
  );
};

const WeChatLogin: React.FC = () => {
  const navigate = useNavigate();
  const [ticket, setTicket] = useState("");
  const updateSessionToken = useUserStore((state) => state.updateSessionToken);

  useIntervalAsync(
    useCallback(async () => {
      if (!ticket) {
        const res = await apiUserLoginGetTicket();
        setTicket(res.ticket);
      } else {
        const res = await apiUserLoginGet(ticket);
        switch (res.status) {
          case serverStatus.success:
            updateSessionToken(
              res.signedToken.token,
              res.signedToken.expiredAt,
            );
            showToast(Locales.User.Success(Locales.User.Login));
            navigate(Path.Chat);
            return;
        }
      }
    }, [ticket, navigate, updateSessionToken]),
    3000,
  );


  if (!ticket) return <Loading noLogo={true}/>;

  return (
    <div className={styles["form-container"]}>
      <span className={styles["title"]}>{Locales.User.WeChatLogin}</span>
      <Image
        className={styles["qrcode"]}
        src={`https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${ticket}`}
        alt="Wechat QrCdoe"
        width={200}
        height={200}
      />
    </div>
  );
};

export function AuthPage() {
  const [tab, setTab] = useState<"email" | "phone">("phone");

  return (
    <div className={styles["auth-page"]}>
      <div className={`no-dark ${styles["auth-logo"]}`}>
        <BotIcon/>
      </div>

      <div className={styles["auth-title"]}>{Locale.Auth.Title}</div>
      <div className={styles["auth-tips"]}>{Locale.Auth.Tips}</div>

      <div className={styles["auth-container"]}>
        {/* <div className={styles["wechat-part"]}>
          <WeChatLogin/>
        </div> */}

        <div className={styles["password-part"]}>
          <div className={styles["tab-container"]}>
            <button
              className={`${styles["tab-button"]} ${
                tab === "phone" ? styles.active : ""
              }`}
              onClick={() => setTab("phone")}
            >
              {Locales.User.CodeLogin}
            </button>
            {emailService && (
              <button
                className={`${styles["tab-button"]} ${
                  tab === "email" ? styles.active : ""
                }`}
                onClick={() => setTab("email")}
              >
                {Locales.User.PasswordLogin}
              </button>
            )}
          </div>
          {tab === "phone" ? <PhoneLogin/> : <EmailLogin/>}
        </div>
      </div>
    </div>
  );
}
